import atexit
import os
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from data.repository import Repository
from models.models import AlertRule
from routes.account_routes import account_bp
from routes.admin_routes import admin_bp
from routes.operator_routes import operator_bp
from routes.public_routes import public_bp
from routes.sim_routes import sim_bp
from services.blackboard import Blackboard
from services.mqtt_ingestor import MQTTIngestor
from services.simulator import SensorSimulator


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _seed_defaults(repo: Repository) -> None:
    if not repo.has_any_rules():
        repo.add_rule(
            AlertRule(
                rule_id=1,
                zone_id="zone-north",
                metric_type="aqi",
                threshold=100,
                comparator=">",
                severity="warning",
            )
        )
        repo.add_rule(
            AlertRule(
                rule_id=2,
                zone_id="zone-central",
                metric_type="noise",
                threshold=80,
                comparator=">",
                severity="warning",
            )
        )
        repo.add_rule(
            AlertRule(
                rule_id=3,
                zone_id="zone-north",
                metric_type="temperature",
                threshold=35,
                comparator=">",
                severity="critical",
            )
        )
        repo.add_rule(
            AlertRule(
                rule_id=4,
                zone_id="zone-central",
                metric_type="aqi",
                threshold=120,
                comparator=">",
                severity="critical",
            )
        )
        repo.add_rule(
            AlertRule(
                rule_id=5,
                zone_id="zone-central",
                metric_type="humidity",
                threshold=75,
                comparator=">",
                severity="warning",
            )
        )

    if not repo.has_any_plants():
        repo.register_zone_plant("zone-north", "North Industrial Plant")
        repo.register_zone_plant("zone-central", "Central Processing Facility")

    if not repo.has_any_users():
        repo.create_user(
            name="SCEMAS Admin",
            email="admin@scemas.local",
            password_hash=generate_password_hash("Admin123!"),
            role="admin",
        )
        repo.create_user(
            name="SCEMAS Operator",
            email="operator@scemas.local",
            password_hash=generate_password_hash("Operator123!"),
            role="operator",
        )


def create_app(config: dict | None = None):
    app = Flask(__name__, static_folder="static")
    CORS(app)

    default_db_path = Path(__file__).resolve().parent / "scemas.db"
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SCEMAS_SECRET_KEY", "scemas-dev-secret"),
        DATABASE_PATH=os.getenv("SCEMAS_DB_PATH", str(default_db_path)),
        MQTT_ENABLED=_env_bool("SCEMAS_MQTT_ENABLED", False),
        MQTT_BROKER_HOST=os.getenv("SCEMAS_MQTT_BROKER_HOST", "127.0.0.1"),
        MQTT_BROKER_PORT=int(os.getenv("SCEMAS_MQTT_BROKER_PORT", "1883")),
        MQTT_TOPIC=os.getenv("SCEMAS_MQTT_TOPIC", "scemas/readings"),
        MQTT_USERNAME=os.getenv("SCEMAS_MQTT_USERNAME", ""),
        MQTT_PASSWORD=os.getenv("SCEMAS_MQTT_PASSWORD", ""),
        SIM_TRANSPORT=os.getenv("SCEMAS_SIM_TRANSPORT", "direct"),
    )

    if config:
        app.config.update(config)

    repo = Repository(app.config["DATABASE_PATH"])
    _seed_defaults(repo)

    blackboard = Blackboard(repo)
    mqtt_ingestor = MQTTIngestor(
        blackboard,
        repo,
        enabled=app.config["MQTT_ENABLED"],
        broker_host=app.config["MQTT_BROKER_HOST"],
        broker_port=app.config["MQTT_BROKER_PORT"],
        topic=app.config["MQTT_TOPIC"],
        username=app.config["MQTT_USERNAME"] or None,
        password=app.config["MQTT_PASSWORD"] or None,
    )
    simulator = SensorSimulator(
        blackboard,
        mqtt_publisher=mqtt_ingestor.publish_reading,
        transport=app.config["SIM_TRANSPORT"],
    )

    mqtt_ingestor.start()
    atexit.register(mqtt_ingestor.stop)

    app.config["repo"] = repo
    app.config["blackboard"] = blackboard
    app.config["simulator"] = simulator
    app.config["mqtt_ingestor"] = mqtt_ingestor

    app.register_blueprint(public_bp)
    app.register_blueprint(operator_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(sim_bp)
    app.register_blueprint(account_bp)

    @app.route("/")
    def home():
        return {
            "message": "SCEMAS backend running",
            "database_path": app.config["DATABASE_PATH"],
            "available_routes": {
                "account": [
                    "/login",
                    "/signup",
                    "/me",
                ],
                "public": [
                    "/public/metrics",
                    "/public/alerts",
                    "/public/zones",
                    "/public/zones/<zone_id>/summary",
                ],
                "operator": [
                    "/operator/alerts",
                    "/operator/alerts/<id>/ack",
                    "/operator/alerts/<id>/resolve",
                ],
                "admin": [
                    "/admin/audit",
                    "/admin/advisories",
                    "/admin/rules",
                ],
                "simulation": [
                    "/sim/start",
                    "/sim/stop",
                    "/sim/status",
                    "/sim/transport",
                ],
            },
        }

    @app.route("/test")
    def test_page():
        return app.send_static_file("index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
