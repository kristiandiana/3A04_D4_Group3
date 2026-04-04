from datetime import datetime
from flask import Blueprint, jsonify, current_app

operator_bp = Blueprint("operator_bp", __name__)


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