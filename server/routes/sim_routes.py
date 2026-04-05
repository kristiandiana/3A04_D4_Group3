from flask import Blueprint, current_app, jsonify, request

from auth_utils import require_role


sim_bp = Blueprint("sim_bp", __name__)
VALID_TRANSPORTS = {"direct", "mqtt"}


@sim_bp.route("/sim/start", methods=["POST"])
@require_role("operator", "admin")
def start_sim():
    simulator = current_app.config["simulator"]
    simulator.start()
    return jsonify({"status": "simulation started", "transport": simulator.transport})


@sim_bp.route("/sim/stop", methods=["POST"])
@require_role("operator", "admin")
def stop_sim():
    simulator = current_app.config["simulator"]
    simulator.stop()
    return jsonify({"status": "simulation stopped", "transport": simulator.transport})


@sim_bp.route("/sim/status", methods=["GET"])
def simulation_status():
    simulator = current_app.config["simulator"]
    mqtt_ingestor = current_app.config["mqtt_ingestor"]
    return jsonify(
        {
            "running": simulator.running,
            "transport": simulator.transport,
            "mqtt": mqtt_ingestor.get_status(),
        }
    )


@sim_bp.route("/sim/transport", methods=["POST"])
@require_role("operator", "admin")
def set_sim_transport():
    simulator = current_app.config["simulator"]
    payload = request.get_json(silent=True) or {}
    transport = str(payload.get("transport", "")).strip().lower()

    if transport not in VALID_TRANSPORTS:
        return jsonify({"error": f"transport must be one of {sorted(VALID_TRANSPORTS)}"}), 400

    simulator.set_transport(transport)
    return jsonify({"status": "transport updated", "transport": simulator.transport})
