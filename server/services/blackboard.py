from data.repository import Repository

class Blackboard:
    def __init__(self, repository: Repository):
        self.repository = repository

    def ingest_reading(self, reading):
        self.repository.add_sensor_reading(reading)
        aggregates = self.repository.recompute_aggregates_for_reading(reading)
        self._evaluate_rules(aggregates["5min"])

    def _evaluate_rules(self, aggregate):
        rules = self.repository.get_active_rules(aggregate.zone_id, aggregate.metric_type)

        for rule in rules:
            if self.repository.get_active_alert_for_rule(rule.rule_id):
                continue

            if self._compare(aggregate.average, rule.threshold, rule.comparator):
                message = (
                    f"{aggregate.metric_type.upper()} 5-minute average exceeded in "
                    f"{aggregate.zone_id}: {aggregate.average:.2f} "
                    f"{rule.comparator} {rule.threshold:.2f}"
                )

                alert = self.repository.create_alert(
                    zone_id=aggregate.zone_id,
                    metric_type=aggregate.metric_type,
                    current_value=aggregate.average,
                    threshold=rule.threshold,
                    severity=rule.severity,
                    message=message,
                    rule_id=rule.rule_id,
                )

                self.repository.add_audit_log(
                    event_type="ALERT_CREATED",
                    actor="system",
                    details=(
                        f"alert_id={alert.alert_id}, zone={alert.zone_id}, metric={alert.metric_type}, "
                        f"window_type={aggregate.window_type}"
                    ),
                )

                self._issue_advisories(
                    aggregate.zone_id,
                    aggregate.metric_type,
                    aggregate.average
                )

    def _issue_advisories(self, zone_id, metric_type, value):
        plants = self.repository.get_plants_for_zone(zone_id)

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
