from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from models.models import SensorReading, AggregatedMetric, AlertRule, Alert, Advisory


class Repository:
    def __init__(self) -> None:
        self.sensor_readings: List[SensorReading] = []
        self.aggregates: List[AggregatedMetric] = []
        self.alert_rules: List[AlertRule] = []
        self.alerts: List[Alert] = []
        self.advisories: List[Advisory] = []
        self.audit_logs: List[Dict] = []

        self.plants_by_zone: Dict[str, List[str]] = defaultdict(list)

        self._rule_id_counter = 1
        self._alert_id_counter = 1
        self._advisory_id_counter = 1

    def add_sensor_reading(self, reading: SensorReading) -> None:
        self.sensor_readings.append(reading)

    def add_aggregate(self, aggregate: AggregatedMetric) -> None:
        self.aggregates.append(aggregate)

    def get_aggregates(
        self,
        zone_id: Optional[str] = None,
        metric_type: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[AggregatedMetric]:
        aggregates = self.aggregates

        if zone_id is not None:
            aggregates = [aggregate for aggregate in aggregates if aggregate.zone_id == zone_id]

        if metric_type is not None:
            aggregates = [aggregate for aggregate in aggregates if aggregate.metric_type == metric_type]

        if limit is not None:
            return aggregates[-limit:]

        return list(aggregates)

    def add_rule(self, rule: AlertRule) -> None:
        if any(existing.rule_id == rule.rule_id for existing in self.alert_rules):
            raise ValueError(f"Rule with id {rule.rule_id} already exists")

        self.alert_rules.append(rule)
        self._rule_id_counter = max(self._rule_id_counter, rule.rule_id + 1)

    def create_rule(
        self,
        zone_id: str,
        metric_type: str,
        threshold: float,
        comparator: str,
        severity: str,
        enabled: bool = True,
    ) -> AlertRule:
        rule = AlertRule(
            rule_id=self._rule_id_counter,
            zone_id=zone_id,
            metric_type=metric_type,
            threshold=threshold,
            comparator=comparator,
            severity=severity,
            enabled=enabled,
        )
        self._rule_id_counter += 1
        self.alert_rules.append(rule)
        return rule

    def get_all_rules(self) -> List[AlertRule]:
        return list(self.alert_rules)

    def get_active_rules(self, zone_id: str, metric_type: str) -> List[AlertRule]:
        return [
            rule for rule in self.alert_rules
            if rule.enabled and rule.zone_id == zone_id and rule.metric_type == metric_type
        ]

    def create_alert(
        self,
        zone_id: str,
        metric_type: str,
        current_value: float,
        threshold: float,
        severity: str,
        message: str,
    ) -> Alert:
        alert = Alert(
            alert_id=self._alert_id_counter,
            zone_id=zone_id,
            metric_type=metric_type,
            current_value=current_value,
            threshold=threshold,
            severity=severity,
            status="active",
            message=message,
            created_at=datetime.utcnow(),
        )
        self._alert_id_counter += 1
        self.alerts.append(alert)
        return alert

    def get_alert_by_id(self, alert_id: int) -> Optional[Alert]:
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                return alert
        return None

    def get_alerts(
        self,
        zone_id: Optional[str] = None,
        statuses: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ) -> List[Alert]:
        alerts = self.alerts

        if zone_id is not None:
            alerts = [alert for alert in alerts if alert.zone_id == zone_id]

        if statuses is not None:
            allowed_statuses = set(statuses)
            alerts = [alert for alert in alerts if alert.status in allowed_statuses]

        if limit is not None:
            return alerts[-limit:]

        return list(alerts)

    def get_active_alerts(self, zone_id: Optional[str] = None) -> List[Alert]:
        return self.get_alerts(zone_id=zone_id, statuses=["active", "acknowledged"])

    def get_latest_metrics_for_zone(self, zone_id: str) -> Dict[str, AggregatedMetric]:
        latest_by_metric: Dict[str, AggregatedMetric] = {}

        for aggregate in self.aggregates:
            if aggregate.zone_id != zone_id:
                continue
            latest_by_metric[aggregate.metric_type] = aggregate

        return latest_by_metric

    def get_known_metrics_for_zone(self, zone_id: str) -> List[str]:
        metrics = {
            rule.metric_type for rule in self.alert_rules if rule.zone_id == zone_id
        }
        metrics.update(
            reading.metric_type for reading in self.sensor_readings if reading.zone_id == zone_id
        )
        metrics.update(
            aggregate.metric_type for aggregate in self.aggregates if aggregate.zone_id == zone_id
        )
        metrics.update(
            alert.metric_type for alert in self.alerts if alert.zone_id == zone_id
        )
        metrics.update(
            advisory.metric_type for advisory in self.advisories if advisory.zone_id == zone_id
        )
        return sorted(metrics)

    def get_known_zones(self) -> List[str]:
        zones = set(self.plants_by_zone.keys())
        zones.update(rule.zone_id for rule in self.alert_rules)
        zones.update(reading.zone_id for reading in self.sensor_readings)
        zones.update(aggregate.zone_id for aggregate in self.aggregates)
        zones.update(alert.zone_id for alert in self.alerts)
        zones.update(advisory.zone_id for advisory in self.advisories)
        return sorted(zones)

    def create_advisory(self, plant_name: str, zone_id: str, metric_type: str, message: str) -> Advisory:
        advisory = Advisory(
            advisory_id=self._advisory_id_counter,
            plant_name=plant_name,
            zone_id=zone_id,
            metric_type=metric_type,
            message=message,
            created_at=datetime.utcnow(),
        )
        self._advisory_id_counter += 1
        self.advisories.append(advisory)
        return advisory

    def add_audit_log(self, event_type: str, actor: str, details: str) -> None:
        self.audit_logs.append({
            "event_type": event_type,
            "actor": actor,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
