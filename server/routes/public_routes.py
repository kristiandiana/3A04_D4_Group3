from flask import Blueprint, jsonify, current_app

public_bp = Blueprint("public_bp", __name__)


@public_bp.route("/public/metrics", methods=["GET"])
def get_metrics():
    repo = current_app.config["repo"]
    latest = []
    for aggregate in repo.aggregates[-10:]:
        row = aggregate.__dict__.copy()
        row["timestamp"] = row["timestamp"].isoformat()
        latest.append(row)
    return jsonify(latest)


@public_bp.route("/public/alerts", methods=["GET"])
def get_alerts():
    repo = current_app.config["repo"]

    alerts = []
    for alert in repo.get_active_alerts():
        data = alert.__dict__.copy()
        data["created_at"] = data["created_at"].isoformat()
        if data["acknowledged_at"]:
            data["acknowledged_at"] = data["acknowledged_at"].isoformat()
        if data["resolved_at"]:
            data["resolved_at"] = data["resolved_at"].isoformat()
        alerts.append(data)

    return jsonify(alerts)