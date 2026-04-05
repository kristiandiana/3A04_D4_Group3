from flask import Blueprint, jsonify, current_app

sim_bp = Blueprint("sim_bp", __name__)


@sim_bp.route("/sim/start", methods=["POST"])
def start_sim():
    simulator = current_app.config["simulator"]
    simulator.start()
    return jsonify({"status": "simulation started"})


@sim_bp.route("/sim/stop", methods=["POST"])
def stop_sim():
    simulator = current_app.config["simulator"]
    simulator.stop()
    return jsonify({"status": "simulation stopped"})


@sim_bp.route("/sim/status", methods=["GET"])
def simulation_status():
    simulator = current_app.config["simulator"]
    return jsonify({"running": simulator.running})
