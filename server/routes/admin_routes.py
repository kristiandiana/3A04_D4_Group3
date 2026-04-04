from flask import Blueprint, jsonify, current_app

admin_bp = Blueprint("admin_bp", __name__)


@admin_bp.route("/admin/audit", methods=["GET"])
def get_audit():
    repo = current_app.config["repo"]
    return jsonify(repo.audit_logs[-100:])


@admin_bp.route("/admin/advisories", methods=["GET"])
def get_advisories():
    repo = current_app.config["repo"]

    advisories = []
    for advisory in repo.advisories:
        data = advisory.__dict__.copy()
        data["created_at"] = data["created_at"].isoformat()
        advisories.append(data)

    return jsonify(advisories)