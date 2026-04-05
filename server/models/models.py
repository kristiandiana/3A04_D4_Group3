from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class SensorReading:
    sensor_id: str
    zone_id: str
    metric_type: str
    value: float
    unit: str
    timestamp: datetime

@dataclass
class AggregatedMetric:
    zone_id: str
    metric_type: str
    average: float
    minimum: float
    maximum: float
    count: int
    timestamp: datetime
    window_type: str = "rolling"
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None

@dataclass
class AlertRule:
    rule_id: int
    zone_id: str
    metric_type: str
    threshold: float
    comparator: str
    severity: str
    enabled: bool = True

@dataclass
class Alert:
    alert_id: int
    zone_id: str
    metric_type: str
    current_value: float
    threshold: float
    severity: str
    status: str
    message: str
    created_at: datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None

@dataclass
class Advisory:
    advisory_id: int
    plant_name: str
    zone_id: str
    metric_type: str
    message: str
    created_at: datetime
    acknowledged: bool = False


@dataclass
class User:
    user_id: int
    name: str
    email: str
    password_hash: str
    role: str
    created_at: datetime
