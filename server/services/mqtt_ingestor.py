import json
from datetime import datetime

from models.models import SensorReading

try:
    from paho.mqtt import client as mqtt_client
except ImportError:  # pragma: no cover
    mqtt_client = None


VALID_METRICS = {
    "aqi": {"unit": "index", "min": 0, "max": 500},
    "temperature": {"unit": "C", "min": -50, "max": 80},
    "humidity": {"unit": "%", "min": 0, "max": 100},
    "noise": {"unit": "dB", "min": 0, "max": 150},
}


class MQTTIngestor:
    def __init__(
        self,
        blackboard,
        repository,
        *,
        enabled: bool,
        broker_host: str,
        broker_port: int,
        topic: str,
        username: str | None = None,
        password: str | None = None,
        client_id: str = "scemas-backend",
    ) -> None:
        self.blackboard = blackboard
        self.repository = repository
        self.enabled = enabled
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.topic = topic
        self.username = username
        self.password = password
        self.client_id = client_id

        self.connected = False
        self.messages_received = 0
        self.messages_rejected = 0
        self.last_error = ""
        self.client = None

    def start(self) -> None:
        if not self.enabled:
            self.last_error = "MQTT ingestion disabled"
            return

        if mqtt_client is None:
            self.last_error = "paho-mqtt is not installed"
            return

        if self.client is not None:
            return

        self.client = mqtt_client.Client(client_id=self.client_id)
        if self.username:
            self.client.username_pw_set(self.username, self.password)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

        try:
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
        except Exception as exc:  # pragma: no cover
            self.last_error = str(exc)

    def stop(self) -> None:
        if not self.client:
            return

        self.client.loop_stop()
        try:
            self.client.disconnect()
        except Exception:  # pragma: no cover
            pass

        self.client = None
        self.connected = False

    def get_status(self) -> dict:
        return {
            "enabled": self.enabled,
            "connected": self.connected,
            "broker_host": self.broker_host,
            "broker_port": self.broker_port,
            "topic": self.topic,
            "messages_received": self.messages_received,
            "messages_rejected": self.messages_rejected,
            "last_error": self.last_error,
        }

    def publish_reading(self, reading: SensorReading) -> bool:
        if not self.connected or not self.client:
            return False

        payload = json.dumps(
            {
                "sensor_id": reading.sensor_id,
                "zone_id": reading.zone_id,
                "metric_type": reading.metric_type,
                "value": reading.value,
                "unit": reading.unit,
                "timestamp": reading.timestamp.isoformat(),
            }
        )
        result = self.client.publish(self.topic, payload)
        return result.rc == mqtt_client.MQTT_ERR_SUCCESS

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):  # pragma: no cover
        if getattr(reason_code, "value", reason_code) == 0:
            self.connected = True
            self.last_error = ""
            client.subscribe(self.topic)
            self.repository.add_audit_log(
                "MQTT_CONNECTED",
                "system",
                f"broker={self.broker_host}:{self.broker_port}, topic={self.topic}",
            )
        else:
            self.connected = False
            self.last_error = f"MQTT connect failed: {reason_code}"

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None):  # pragma: no cover
        self.connected = False
        if getattr(reason_code, "value", reason_code) not in (0, None):
            self.last_error = f"MQTT disconnected: {reason_code}"

    def _on_message(self, client, userdata, message):  # pragma: no cover
        try:
            payload = json.loads(message.payload.decode("utf-8"))
            reading = self._payload_to_reading(payload)
            self.blackboard.ingest_reading(reading)
            self.messages_received += 1
        except Exception as exc:
            self.messages_rejected += 1
            self.last_error = str(exc)

    def _payload_to_reading(self, payload: dict) -> SensorReading:
        if not isinstance(payload, dict):
            raise ValueError("MQTT payload must be a JSON object")

        sensor_id = str(payload.get("sensor_id", "")).strip()
        zone_id = str(payload.get("zone_id", "")).strip()
        metric_type = str(payload.get("metric_type", "")).strip().lower()

        if not sensor_id or not zone_id or metric_type not in VALID_METRICS:
            raise ValueError("MQTT payload missing required sensor metadata")

        try:
            value = float(payload.get("value"))
        except (TypeError, ValueError):
            raise ValueError("MQTT payload value must be numeric") from None

        metric_config = VALID_METRICS[metric_type]
        if value < metric_config["min"] or value > metric_config["max"]:
            raise ValueError("MQTT payload value outside plausible range")

        unit = str(payload.get("unit") or metric_config["unit"]).strip()
        if unit != metric_config["unit"]:
            raise ValueError("MQTT payload unit does not match expected metric unit")

        timestamp_raw = payload.get("timestamp")
        timestamp = datetime.utcnow()
        if timestamp_raw:
            timestamp = datetime.fromisoformat(str(timestamp_raw))

        return SensorReading(
            sensor_id=sensor_id,
            zone_id=zone_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            timestamp=timestamp,
        )
