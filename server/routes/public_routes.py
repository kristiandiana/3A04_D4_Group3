from collections import defaultdict, deque
from time import time

from flask import Blueprint, jsonify, current_app, request

public_bp = Blueprint("public_bp", __name__)

PUBLIC_RATE_LIMIT = 60
PUBLIC_RATE_WINDOW_SECONDS = 60
_public_request_log = defaultdict(deque)
VALID_ALERT_STATUSES = {"active", "acknowledged", "resolved"}
VALID_WINDOW_TYPES = {"5min", "hourly"}


def _serialize_aggregate(aggregate):
    return {
        "zone_id": aggregate.zone_id,
        "metric_type": aggregate.metric_type,
        "average": aggregate.average,
        "minimum": aggregate.minimum,
        "maximum": aggregate.maximum,
        "count": aggregate.count,
        "timestamp": aggregate.timestamp.isoformat(),
        "window_type": aggregate.window_type,
        "window_start": aggregate.window_start.isoformat() if aggregate.window_start else None,
        "window_end": aggregate.window_end.isoformat() if aggregate.window_end else None,
    }


def _serialize_alert(alert):
    return {
        "alert_id": alert.alert_id,
        "zone_id": alert.zone_id,
        "metric_type": alert.metric_type,
        "current_value": alert.current_value,
        "threshold": alert.threshold,
        "severity": alert.severity,
        "status": alert.status,
        "message": alert.message,
        "created_at": alert.created_at.isoformat(),
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "resolved_by": alert.resolved_by,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
    }


def _parse_limit(default=20, maximum=100):
    raw_limit = request.args.get("limit", str(default))

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return None, jsonify({"error": "limit must be an integer"}), 400

    if limit < 1 or limit > maximum:
        return None, jsonify({"error": f"limit must be between 1 and {maximum}"}), 400

    return limit, None, None


@public_bp.before_app_request
def enforce_public_rate_limit():
    if not request.path.startswith("/public/"):
        return None

    now = time()
    client_id = request.headers.get("X-Forwarded-For", request.remote_addr or "local").split(",")[0].strip()
    request_times = _public_request_log[client_id]

    while request_times and now - request_times[0] > PUBLIC_RATE_WINDOW_SECONDS:
        request_times.popleft()

    if len(request_times) >= PUBLIC_RATE_LIMIT:
        return jsonify({
            "error": "Public API rate limit exceeded",
            "retry_after_seconds": PUBLIC_RATE_WINDOW_SECONDS,
        }), 429

    request_times.append(now)
    return None


@public_bp.route("/public/metrics", methods=["GET"])
def get_metrics():
    repo = current_app.config["repo"]
    zone_id = request.args.get("zone_id")
    metric_type = request.args.get("metric_type")
    window_type = request.args.get("window_type", "5min")

    limit, error_response, status_code = _parse_limit()
    if error_response:
        return error_response, status_code

    if window_type not in VALID_WINDOW_TYPES:
        return jsonify({"error": f"window_type must be one of {sorted(VALID_WINDOW_TYPES)}"}), 400

    aggregates = repo.get_aggregates(
        zone_id=zone_id,
        metric_type=metric_type,
        window_type=window_type,
        limit=limit,
    )
    return jsonify([_serialize_aggregate(aggregate) for aggregate in aggregates])


@public_bp.route("/public/zones", methods=["GET"])
def get_zones():
    repo = current_app.config["repo"]

    zones = []
    for zone_id in repo.get_known_zones():
        zones.append({
            "zone_id": zone_id,
            "available_metrics": repo.get_known_metrics_for_zone(zone_id),
        })

    return jsonify(zones)


@public_bp.route("/public/zones/<zone_id>/summary", methods=["GET"])
def get_zone_summary(zone_id: str):
    repo = current_app.config["repo"]
    known_zones = repo.get_known_zones()

    if zone_id not in known_zones:
        return jsonify({"error": "Zone not found"}), 404

    payload = {
        "zone_id": zone_id,
        "metrics": repo.get_zone_summary(zone_id),
    }

    return jsonify(payload)


@public_bp.route("/public/alerts", methods=["GET"])
def get_alerts():
    repo = current_app.config["repo"]
    zone_id = request.args.get("zone_id")
    status = request.args.get("status")

    limit, error_response, status_code = _parse_limit()
    if error_response:
        return error_response, status_code

    if status and status not in VALID_ALERT_STATUSES:
        return jsonify({
            "error": f"status must be one of {sorted(VALID_ALERT_STATUSES)}"
        }), 400

    if status:
        alerts = repo.get_alerts(zone_id=zone_id, statuses=[status], limit=limit)
    else:
        alerts = repo.get_active_alerts(zone_id=zone_id)[-limit:]

    return jsonify([_serialize_alert(alert) for alert in alerts])
