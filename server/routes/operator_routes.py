from datetime import datetime
from flask import Blueprint, jsonify, current_app, request

operator_bp = Blueprint("operator_bp", __name__)


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


@operator_bp.route("/operator/alerts", methods=["GET"])
def get_operator_alerts():
    repo = current_app.config["repo"]
    zone_id = request.args.get("zone_id")
    status = request.args.get("status")
    raw_limit = request.args.get("limit", "50")

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be an integer"}), 400

    if limit < 1 or limit > 200:
        return jsonify({"error": "limit must be between 1 and 200"}), 400

    if status:
        alerts = repo.get_alerts(zone_id=zone_id, statuses=[status], limit=limit)
    else:
        alerts = repo.get_active_alerts(zone_id=zone_id)[-limit:]

    return jsonify([_serialize_alert(alert) for alert in alerts])


@operator_bp.route("/operator/alerts/<int:alert_id>/ack", methods=["POST"])
def acknowledge_alert(alert_id: int):
    repo = current_app.config["repo"]
    alert = repo.get_alert_by_id(alert_id)

    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if alert.status != "active":
        return jsonify({"error": "Only active alerts can be acknowledged"}), 400

    alert.status = "acknowledged"
    alert.acknowledged_by = "operator1"
    alert.acknowledged_at = datetime.utcnow()

    repo.add_audit_log("ALERT_ACKNOWLEDGED", "operator1", f"alert_id={alert_id}")
    return jsonify({"status": "acknowledged", "alert_id": alert_id})


@operator_bp.route("/operator/alerts/<int:alert_id>/resolve", methods=["POST"])
def resolve_alert(alert_id: int):
    repo = current_app.config["repo"]
    alert = repo.get_alert_by_id(alert_id)

    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if alert.status not in ("active", "acknowledged"):
        return jsonify({"error": "Alert cannot be resolved"}), 400

    alert.status = "resolved"
    alert.resolved_by = "operator1"
    alert.resolved_at = datetime.utcnow()

    repo.add_audit_log("ALERT_RESOLVED", "operator1", f"alert_id={alert_id}")
    return jsonify({"status": "resolved", "alert_id": alert_id})
