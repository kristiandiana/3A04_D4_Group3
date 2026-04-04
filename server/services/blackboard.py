from datetime import datetime
from models.models import AggregatedMetric
from data.repository import Repository

class Blackboard:
    def __init__(self, repository):
        self.repository = repository

        # structure:
        # {
        #   "zone-north": {
        #       "aqi": [90, 105, 110],
        #       "temperature": [25, 27]
        #   }
        # }
        self.knowledge_base = {}

        # how many recent values to keep
        self.window_size = 10

    def ingest_reading(self, reading):
        # store raw reading in repository
        self.repository.add_sensor_reading(reading)

        zone_id = reading.zone_id
        metric_type = reading.metric_type
        value = reading.value

        # create zone if it does not exist
        if zone_id not in self.knowledge_base:
            self.knowledge_base[zone_id] = {}

        # create metric list if it does not exist
        if metric_type not in self.knowledge_base[zone_id]:
            self.knowledge_base[zone_id][metric_type] = []

        # add new value
        self.knowledge_base[zone_id][metric_type].append(value)

        # keep only last N values
        if len(self.knowledge_base[zone_id][metric_type]) > self.window_size:
            self.knowledge_base[zone_id][metric_type].pop(0)

        # build aggregate
        aggregate = self._aggregate(zone_id, metric_type)

        # save aggregate
        self.repository.add_aggregate(aggregate)

        # evaluate rules
        self._evaluate_rules(aggregate)

    def _aggregate(self, zone_id, metric_type):
        values = self.knowledge_base[zone_id][metric_type]

        average = sum(values) / len(values)
        minimum = min(values)
        maximum = max(values)
        count = len(values)

        return AggregatedMetric(
            zone_id=zone_id,
            metric_type=metric_type,
            average=average,
            minimum=minimum,
            maximum=maximum,
            count=count,
            timestamp=datetime.utcnow()
        )

    def _evaluate_rules(self, aggregate):
        rules = self.repository.get_active_rules(aggregate.zone_id, aggregate.metric_type)

        for rule in rules:
            if self._compare(aggregate.average, rule.threshold, rule.comparator):
                message = (
                    f"{aggregate.metric_type.upper()} threshold exceeded in "
                    f"{aggregate.zone_id}: {aggregate.average:.2f} "
                    f"{rule.comparator} {rule.threshold:.2f}"
                )

                alert = self.repository.create_alert(
                    zone_id=aggregate.zone_id,
                    metric_type=aggregate.metric_type,
                    current_value=aggregate.average,
                    threshold=rule.threshold,
                    severity=rule.severity,
                    message=message
                )

                self.repository.add_audit_log(
                    event_type="ALERT_CREATED",
                    actor="system",
                    details=f"alert_id={alert.alert_id}, zone={alert.zone_id}, metric={alert.metric_type}"
                )

                self._issue_advisories(
                    aggregate.zone_id,
                    aggregate.metric_type,
                    aggregate.average
                )

    def _issue_advisories(self, zone_id, metric_type, value):
        plants = self.repository.plants_by_zone.get(zone_id, [])

        for plant in plants:
            advisory = self.repository.create_advisory(
                plant_name=plant,
                zone_id=zone_id,
                metric_type=metric_type,
                message=f"Preventive advisory: elevated {metric_type} in {zone_id} ({value:.2f})"
            )

            self.repository.add_audit_log(
                event_type="ADVISORY_CREATED",
                actor="system",
                details=f"advisory_id={advisory.advisory_id}, plant={plant}"
            )

    def _compare(self, current, threshold, comparator):
        if comparator == ">":
            return current > threshold
        elif comparator == "<":
            return current < threshold
        elif comparator == ">=":
            return current >= threshold
        elif comparator == "<=":
            return current <= threshold
        else:
            return False