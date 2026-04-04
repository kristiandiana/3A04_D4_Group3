from flask import Flask
from flask_cors import CORS

from data.repository import Repository
from services.blackboard import Blackboard
from services.simulator import SensorSimulator
from models.models import AlertRule

from routes.public_routes import public_bp
from routes.operator_routes import operator_bp
from routes.admin_routes import admin_bp
from routes.sim_routes import sim_bp
from routes.account_routes import account_bp


def create_app():
    app = Flask(__name__, static_folder="static")
    CORS(app)

    repo = Repository()
    blackboard = Blackboard(repo)
    simulator = SensorSimulator(blackboard)

    # example alert rules
    repo.add_rule(
        AlertRule(
            rule_id=1,
            zone_id="zone-north",
            metric_type="aqi",
            threshold=100,
            comparator=">",
            severity="warning"
        )
    )

    repo.add_rule(
        AlertRule(
            rule_id=2,
            zone_id="zone-central",
            metric_type="noise",
            threshold=80,
            comparator=">",
            severity="warning"
        )
    )

    repo.add_rule(
        AlertRule(
            rule_id=3,
            zone_id="zone-north",
            metric_type="temperature",
            threshold=35,
            comparator=">",
            severity="critical"
        )
    )

    repo.add_rule(
        AlertRule(
            rule_id=4,
            zone_id="zone-central",
            metric_type="aqi",
            threshold=120,
            comparator=">",
            severity="critical"
        )
    )

    #example industrial plants for advisory integration
    repo.plants_by_zone["zone-north"].append("North Industrial Plant")
    repo.plants_by_zone["zone-central"].append("Central Processing Facility")

    # Share core objects with routes
    app.config["repo"] = repo
    app.config["blackboard"] = blackboard
    app.config["simulator"] = simulator

    # Register blueprints
    app.register_blueprint(public_bp)
    app.register_blueprint(operator_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(sim_bp)
    app.register_blueprint(account_bp)

    @app.route("/")
    def home():
        return {
            "message": "SCEMAS backend running",
            "available_routes": {
                "public": [
                    "/public/metrics",
                    "/public/alerts"
                ],
                "operator": [
                    "/operator/alerts/<id>/ack",
                    "/operator/alerts/<id>/resolve"
                ],
                "admin": [
                    "/admin/audit",
                    "/admin/advisories"
                ],
                "simulation": [
                    "/sim/start",
                    "/sim/stop"
                ],
                "test_page": [
                    "/test"
                ]
            }
        }

    @app.route("/test")
    def test_page():
        return app.send_static_file("index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)