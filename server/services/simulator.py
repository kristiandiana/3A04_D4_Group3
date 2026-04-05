import random
import threading
import time
from datetime import datetime
from typing import Dict, List

from models.models import SensorReading
from services.blackboard import Blackboard


class SensorSimulator:
    def __init__(self, blackboard: Blackboard, mqtt_publisher=None, transport: str = "direct") -> None:
        self.blackboard = blackboard
        self.mqtt_publisher = mqtt_publisher
        self.running = False
        self.thread = None
        self.transport = transport

        self.sensors: List[Dict] = [
            {"sensor_id": "aq-001", "zone_id": "zone-north", "metric_type": "aqi", "unit": "index"},
            {"sensor_id": "tmp-001", "zone_id": "zone-north", "metric_type": "temperature", "unit": "C"},
            {"sensor_id": "hum-001", "zone_id": "zone-north", "metric_type": "humidity", "unit": "%"},
            {"sensor_id": "noi-001", "zone_id": "zone-central", "metric_type": "noise", "unit": "dB"},
            {"sensor_id": "aq-002", "zone_id": "zone-central", "metric_type": "aqi", "unit": "index"},
            {"sensor_id": "hum-002", "zone_id": "zone-central", "metric_type": "humidity", "unit": "%"},
        ]

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.running = False

    def set_transport(self, transport: str) -> None:
        self.transport = transport

    def _run_loop(self) -> None:
        while self.running:
            for sensor in self.sensors:
                reading = self._generate_reading(sensor)
                published = False
                if self.transport == "mqtt" and self.mqtt_publisher:
                    published = self.mqtt_publisher(reading)

                if not published:
                    self.blackboard.ingest_reading(reading)
            time.sleep(2)

    def _generate_reading(self, sensor: Dict) -> SensorReading:
        metric = sensor["metric_type"]

        if metric == "aqi":
            value = random.uniform(60, 160)
        elif metric == "temperature":
            value = random.uniform(18, 40)
        elif metric == "humidity":
            value = random.uniform(35, 90)
        elif metric == "noise":
            value = random.uniform(45, 95)
        else:
            value = random.uniform(0, 100)

        return SensorReading(
            sensor_id=sensor["sensor_id"],
            zone_id=sensor["zone_id"],
            metric_type=metric,
            value=round(value, 2),
            unit=sensor["unit"],
            timestamp=datetime.utcnow(),
        )
