from flask import Blueprint, jsonify, current_app, request

from auth_utils import get_authenticated_user, require_role


admin_bp = Blueprint("admin_bp", __name__)

VALID_COMPARATORS = {">", "<", ">=", "<="}
VALID_SEVERITIES = {"warning", "critical"}


def _serialize_rule(rule):
    return {
        "rule_id": rule.rule_id,
        "zone_id": rule.zone_id,
        "metric_type": rule.metric_type,
        "threshold": rule.threshold,
        "comparator": rule.comparator,
        "severity": rule.severity,
        "enabled": rule.enabled,
    }


def _coerce_enabled(value):
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False

    return None


def _validate_rule_payload(payload):
    if not isinstance(payload, dict):
        return None, "Request body must be a JSON object"

    zone_id = str(payload.get("zone_id", "")).strip()
    metric_type = str(payload.get("metric_type", "")).strip().lower()
    comparator = str(payload.get("comparator", "")).strip()
    severity = str(payload.get("severity", "")).strip().lower()

    if not zone_id:
        return None, "zone_id is required"

    if not metric_type:
        return None, "metric_type is required"

    try:
        threshold = float(payload.get("threshold"))
    except (TypeError, ValueError):
        return None, "threshold must be a number"

    if comparator not in VALID_COMPARATORS:
        return None, f"comparator must be one of {sorted(VALID_COMPARATORS)}"

    if severity not in VALID_SEVERITIES:
        return None, f"severity must be one of {sorted(VALID_SEVERITIES)}"

    enabled = _coerce_enabled(payload.get("enabled", True))
    if enabled is None:
        return None, "enabled must be a boolean"

    return {
        "zone_id": zone_id,
        "metric_type": metric_type,
        "threshold": threshold,
        "comparator": comparator,
        "severity": severity,
        "enabled": enabled,
    }, None


@admin_bp.route("/admin/audit", methods=["GET"])
@require_role("admin")
def get_audit():
    repo = current_app.config["repo"]
    return jsonify(repo.get_audit_logs(100))


@admin_bp.route("/admin/advisories", methods=["GET"])
@require_role("admin")
def get_advisories():
    repo = current_app.config["repo"]
    return jsonify(
        [
            {
                "advisory_id": advisory.advisory_id,
                "plant_name": advisory.plant_name,
                "zone_id": advisory.zone_id,
                "metric_type": advisory.metric_type,
                "message": advisory.message,
                "created_at": advisory.created_at.isoformat(),
                "acknowledged": advisory.acknowledged,
            }
            for advisory in repo.get_advisories()
        ]
    )


@admin_bp.route("/admin/rules", methods=["GET"])
@require_role("admin")
def get_rules():
    repo = current_app.config["repo"]
    return jsonify([_serialize_rule(rule) for rule in repo.get_all_rules()])


@admin_bp.route("/admin/rules", methods=["POST"])
@require_role("admin")
def create_rule():
    repo = current_app.config["repo"]
    payload = request.get_json(silent=True)

    data, error = _validate_rule_payload(payload)
    if error:
        return jsonify({"error": error}), 400

    rule = repo.create_rule(**data)
    actor = get_authenticated_user()
    repo.add_audit_log(
        "RULE_CREATED",
        actor.email,
        (
            f"rule_id={rule.rule_id}, zone={rule.zone_id}, metric={rule.metric_type}, "
            f"comparator={rule.comparator}, threshold={rule.threshold}, severity={rule.severity}"
        ),
    )

    return jsonify(_serialize_rule(rule)), 201
