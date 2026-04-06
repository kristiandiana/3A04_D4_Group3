import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

from models.models import Advisory, AggregatedMetric, Alert, AlertRule, SensorReading, User


class Repository:
    def __init__(self, db_path: Optional[str] = None) -> None:
        default_db_path = Path(__file__).resolve().parents[1] / "scemas.db"
        self.db_path = str(db_path or default_db_path)
        self._lock = threading.RLock()
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_schema()

    def _create_schema(self) -> None:
        with self._lock:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sensor_id TEXT NOT NULL,
                    zone_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS aggregated_metrics (
                    aggregate_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    window_type TEXT NOT NULL,
                    zone_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    window_start TEXT NOT NULL,
                    window_end TEXT NOT NULL,
                    average REAL NOT NULL,
                    minimum REAL NOT NULL,
                    maximum REAL NOT NULL,
                    count INTEGER NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(window_type, zone_id, metric_type, window_start)
                );

                CREATE TABLE IF NOT EXISTS alert_rules (
                    rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    zone_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    threshold REAL NOT NULL,
                    comparator TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_id INTEGER,
                    zone_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    current_value REAL NOT NULL,
                    threshold REAL NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    acknowledged_by TEXT,
                    acknowledged_at TEXT,
                    resolved_by TEXT,
                    resolved_at TEXT
                );

                CREATE TABLE IF NOT EXISTS advisories (
                    advisory_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plant_name TEXT NOT NULL,
                    zone_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    acknowledged INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    details TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS zone_plants (
                    zone_id TEXT NOT NULL,
                    plant_name TEXT NOT NULL,
                    UNIQUE(zone_id, plant_name)
                );

                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            self.conn.commit()

    def _timestamp_to_storage(self, value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() if value else None

    def _storage_to_timestamp(self, value: Optional[str]) -> Optional[datetime]:
        return datetime.fromisoformat(value) if value else None

    def _serialize_status_list(self, statuses: List[str]) -> str:
        return ",".join(statuses)

    def _window_bounds(self, timestamp: datetime, window_type: str) -> tuple[datetime, datetime]:
        normalized = timestamp.replace(second=0, microsecond=0)

        if window_type == "5min":
            minute = normalized.minute - (normalized.minute % 5)
            start = normalized.replace(minute=minute)
            end = start + timedelta(minutes=5)
            return start, end

        if window_type == "hourly":
            start = normalized.replace(minute=0)
            end = start + timedelta(hours=1)
            return start, end

        raise ValueError(f"Unsupported window_type {window_type}")

    def _row_to_sensor_reading(self, row: sqlite3.Row) -> SensorReading:
        return SensorReading(
            sensor_id=row["sensor_id"],
            zone_id=row["zone_id"],
            metric_type=row["metric_type"],
            value=row["value"],
            unit=row["unit"],
            timestamp=self._storage_to_timestamp(row["timestamp"]),
        )

    def _row_to_aggregate(self, row: sqlite3.Row) -> AggregatedMetric:
        return AggregatedMetric(
            zone_id=row["zone_id"],
            metric_type=row["metric_type"],
            average=row["average"],
            minimum=row["minimum"],
            maximum=row["maximum"],
            count=row["count"],
            timestamp=self._storage_to_timestamp(row["updated_at"]),
            window_type=row["window_type"],
            window_start=self._storage_to_timestamp(row["window_start"]),
            window_end=self._storage_to_timestamp(row["window_end"]),
        )

    def _row_to_rule(self, row: sqlite3.Row) -> AlertRule:
        return AlertRule(
            rule_id=row["rule_id"],
            zone_id=row["zone_id"],
            metric_type=row["metric_type"],
            threshold=row["threshold"],
            comparator=row["comparator"],
            severity=row["severity"],
            enabled=bool(row["enabled"]),
        )

    def _row_to_alert(self, row: sqlite3.Row) -> Alert:
        return Alert(
            alert_id=row["alert_id"],
            zone_id=row["zone_id"],
            metric_type=row["metric_type"],
            current_value=row["current_value"],
            threshold=row["threshold"],
            severity=row["severity"],
            status=row["status"],
            message=row["message"],
            created_at=self._storage_to_timestamp(row["created_at"]),
            acknowledged_by=row["acknowledged_by"],
            acknowledged_at=self._storage_to_timestamp(row["acknowledged_at"]),
            resolved_by=row["resolved_by"],
            resolved_at=self._storage_to_timestamp(row["resolved_at"]),
        )

    def _row_to_advisory(self, row: sqlite3.Row) -> Advisory:
        return Advisory(
            advisory_id=row["advisory_id"],
            plant_name=row["plant_name"],
            zone_id=row["zone_id"],
            metric_type=row["metric_type"],
            message=row["message"],
            created_at=self._storage_to_timestamp(row["created_at"]),
            acknowledged=bool(row["acknowledged"]),
        )

    def _row_to_user(self, row: sqlite3.Row) -> User:
        return User(
            user_id=row["user_id"],
            name=row["name"],
            email=row["email"],
            password_hash=row["password_hash"],
            role=row["role"],
            created_at=self._storage_to_timestamp(row["created_at"]),
        )

    def has_any_rules(self) -> bool:
        with self._lock:
            row = self.conn.execute("SELECT COUNT(*) AS count FROM alert_rules").fetchone()
            return bool(row["count"])

    def has_any_users(self) -> bool:
        with self._lock:
            row = self.conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
            return bool(row["count"])

    def has_any_plants(self) -> bool:
        with self._lock:
            row = self.conn.execute("SELECT COUNT(*) AS count FROM zone_plants").fetchone()
            return bool(row["count"])

    def register_zone_plant(self, zone_id: str, plant_name: str) -> None:
        with self._lock:
            self.conn.execute(
                """
                INSERT OR IGNORE INTO zone_plants (zone_id, plant_name)
                VALUES (?, ?)
                """,
                (zone_id, plant_name),
            )
            self.conn.commit()

    def get_plants_for_zone(self, zone_id: str) -> List[str]:
        with self._lock:
            rows = self.conn.execute(
                """
                SELECT plant_name
                FROM zone_plants
                WHERE zone_id = ?
                ORDER BY plant_name ASC
                """,
                (zone_id,),
            ).fetchall()
            return [row["plant_name"] for row in rows]

    def add_sensor_reading(self, reading: SensorReading) -> None:
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO sensor_readings (sensor_id, zone_id, metric_type, value, unit, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    reading.sensor_id,
                    reading.zone_id,
                    reading.metric_type,
                    reading.value,
                    reading.unit,
                    self._timestamp_to_storage(reading.timestamp),
                ),
            )
            self.conn.commit()

    def recompute_aggregates_for_reading(self, reading: SensorReading) -> Dict[str, AggregatedMetric]:
        return {
            "5min": self._upsert_window_aggregate(reading.zone_id, reading.metric_type, "5min", reading.timestamp),
            "hourly": self._upsert_window_aggregate(reading.zone_id, reading.metric_type, "hourly", reading.timestamp),
        }

    def _upsert_window_aggregate(
        self,
        zone_id: str,
        metric_type: str,
        window_type: str,
        reference_time: datetime,
    ) -> AggregatedMetric:
        window_start, window_end = self._window_bounds(reference_time, window_type)

        with self._lock:
            stats = self.conn.execute(
                """
                SELECT
                    AVG(value) AS average,
                    MIN(value) AS minimum,
                    MAX(value) AS maximum,
                    COUNT(*) AS count
                FROM sensor_readings
                WHERE zone_id = ?
                  AND metric_type = ?
                  AND timestamp >= ?
                  AND timestamp < ?
                """,
                (
                    zone_id,
                    metric_type,
                    self._timestamp_to_storage(window_start),
                    self._timestamp_to_storage(window_end),
                ),
            ).fetchone()

            aggregate = AggregatedMetric(
                zone_id=zone_id,
                metric_type=metric_type,
                average=float(stats["average"]),
                minimum=float(stats["minimum"]),
                maximum=float(stats["maximum"]),
                count=int(stats["count"]),
                timestamp=reference_time,
                window_type=window_type,
                window_start=window_start,
                window_end=window_end,
            )

            self.conn.execute(
                """
                INSERT INTO aggregated_metrics (
                    window_type, zone_id, metric_type, window_start, window_end,
                    average, minimum, maximum, count, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(window_type, zone_id, metric_type, window_start)
                DO UPDATE SET
                    window_end = excluded.window_end,
                    average = excluded.average,
                    minimum = excluded.minimum,
                    maximum = excluded.maximum,
                    count = excluded.count,
                    updated_at = excluded.updated_at
                """,
                (
                    window_type,
                    zone_id,
                    metric_type,
                    self._timestamp_to_storage(window_start),
                    self._timestamp_to_storage(window_end),
                    aggregate.average,
                    aggregate.minimum,
                    aggregate.maximum,
                    aggregate.count,
                    self._timestamp_to_storage(reference_time),
                ),
            )
            self.conn.commit()

        return aggregate

    def get_aggregates(
        self,
        zone_id: Optional[str] = None,
        metric_type: Optional[str] = None,
        window_type: Optional[str] = "5min",
        limit: Optional[int] = None,
    ) -> List[AggregatedMetric]:
        clauses = []
        params: List[object] = []

        if zone_id is not None:
            clauses.append("zone_id = ?")
            params.append(zone_id)

        if metric_type is not None:
            clauses.append("metric_type = ?")
            params.append(metric_type)

        if window_type is not None:
            clauses.append("window_type = ?")
            params.append(window_type)

        query = """
            SELECT *
            FROM aggregated_metrics
        """

        if clauses:
            query += " WHERE " + " AND ".join(clauses)

        query += " ORDER BY updated_at DESC"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        with self._lock:
            rows = self.conn.execute(query, params).fetchall()

        return [self._row_to_aggregate(row) for row in reversed(rows)]

    def get_latest_aggregate(
        self,
        zone_id: str,
        metric_type: str,
        window_type: str,
    ) -> Optional[AggregatedMetric]:
        with self._lock:
            row = self.conn.execute(
                """
                SELECT *
                FROM aggregated_metrics
                WHERE zone_id = ?
                  AND metric_type = ?
                  AND window_type = ?
                ORDER BY window_start DESC, updated_at DESC
                LIMIT 1
                """,
                (zone_id, metric_type, window_type),
            ).fetchone()

        return self._row_to_aggregate(row) if row else None

    def get_latest_aggregates_per_series(self, window_type: str) -> List[AggregatedMetric]:
        """One row per (zone_id, metric_type): the aggregate with the latest updated_at."""
        with self._lock:
            rows = self.conn.execute(
                """
                SELECT a.*
                FROM aggregated_metrics AS a
                INNER JOIN (
                    SELECT zone_id, metric_type, MAX(updated_at) AS max_updated
                    FROM aggregated_metrics
                    WHERE window_type = ?
                    GROUP BY zone_id, metric_type
                ) AS latest
                ON a.zone_id = latest.zone_id
                AND a.metric_type = latest.metric_type
                AND a.updated_at = latest.max_updated
                AND a.window_type = ?
                """,
                (window_type, window_type),
            ).fetchall()

        return [self._row_to_aggregate(row) for row in rows]

    def get_zone_summary(self, zone_id: str) -> List[Dict]:
        summaries = []

        for metric_type in self.get_known_metrics_for_zone(zone_id):
            five_minute = self.get_latest_aggregate(zone_id, metric_type, "5min")
            hourly = self.get_latest_aggregate(zone_id, metric_type, "hourly")

            if not five_minute and not hourly:
                continue

            summaries.append(
                {
                    "metric_type": metric_type,
                    "five_minute_average": five_minute.average if five_minute else None,
                    "five_minute_minimum": five_minute.minimum if five_minute else None,
                    "five_minute_maximum": five_minute.maximum if five_minute else None,
                    "five_minute_count": five_minute.count if five_minute else 0,
                    "five_minute_window_start": self._timestamp_to_storage(five_minute.window_start) if five_minute else None,
                    "five_minute_window_end": self._timestamp_to_storage(five_minute.window_end) if five_minute else None,
                    "hourly_average": hourly.average if hourly else None,
                    "hourly_maximum": hourly.maximum if hourly else None,
                    "hourly_count": hourly.count if hourly else 0,
                    "hourly_window_start": self._timestamp_to_storage(hourly.window_start) if hourly else None,
                    "hourly_window_end": self._timestamp_to_storage(hourly.window_end) if hourly else None,
                    "updated_at": self._timestamp_to_storage(five_minute.timestamp if five_minute else hourly.timestamp if hourly else None),
                }
            )

        return summaries

    def add_rule(self, rule: AlertRule) -> None:
        with self._lock:
            try:
                self.conn.execute(
                    """
                    INSERT INTO alert_rules (
                        rule_id, zone_id, metric_type, threshold, comparator, severity, enabled
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rule.rule_id,
                        rule.zone_id,
                        rule.metric_type,
                        rule.threshold,
                        rule.comparator,
                        rule.severity,
                        int(rule.enabled),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError(f"Rule with id {rule.rule_id} already exists") from exc

            self.conn.commit()

    def create_rule(
        self,
        zone_id: str,
        metric_type: str,
        threshold: float,
        comparator: str,
        severity: str,
        enabled: bool = True,
    ) -> AlertRule:
        with self._lock:
            cursor = self.conn.execute(
                """
                INSERT INTO alert_rules (
                    zone_id, metric_type, threshold, comparator, severity, enabled
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (zone_id, metric_type, threshold, comparator, severity, int(enabled)),
            )
            self.conn.commit()

            return AlertRule(
                rule_id=cursor.lastrowid,
                zone_id=zone_id,
                metric_type=metric_type,
                threshold=threshold,
                comparator=comparator,
                severity=severity,
                enabled=enabled,
            )

    def get_all_rules(self) -> List[AlertRule]:
        with self._lock:
            rows = self.conn.execute(
                """
                SELECT *
                FROM alert_rules
                ORDER BY rule_id ASC
                """
            ).fetchall()

        return [self._row_to_rule(row) for row in rows]

    def delete_rule(self, rule_id: int) -> bool:
        with self._lock:
            cursor = self.conn.execute("DELETE FROM alert_rules WHERE rule_id = ?", (rule_id,))
            self.conn.commit()
            return cursor.rowcount > 0

    def get_active_rules(self, zone_id: str, metric_type: str) -> List[AlertRule]:
        with self._lock:
            rows = self.conn.execute(
                """
                SELECT *
                FROM alert_rules
                WHERE enabled = 1
                  AND zone_id = ?
                  AND metric_type = ?
                ORDER BY rule_id ASC
                """,
                (zone_id, metric_type),
            ).fetchall()

        return [self._row_to_rule(row) for row in rows]

    def create_alert(
        self,
        zone_id: str,
        metric_type: str,
        current_value: float,
        threshold: float,
        severity: str,
        message: str,
        rule_id: Optional[int] = None,
    ) -> Alert:
        created_at = datetime.utcnow()

        with self._lock:
            cursor = self.conn.execute(
                """
                INSERT INTO alerts (
                    rule_id, zone_id, metric_type, current_value, threshold,
                    severity, status, message, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rule_id,
                    zone_id,
                    metric_type,
                    current_value,
                    threshold,
                    severity,
                    "active",
                    message,
                    self._timestamp_to_storage(created_at),
                ),
            )
            self.conn.commit()

            return Alert(
                alert_id=cursor.lastrowid,
                zone_id=zone_id,
                metric_type=metric_type,
                current_value=current_value,
                threshold=threshold,
                severity=severity,
                status="active",
                message=message,
                created_at=created_at,
            )

    def get_active_alert_for_rule(self, rule_id: int) -> Optional[Alert]:
        with self._lock:
            row = self.conn.execute(
                """
                SELECT *
                FROM alerts
                WHERE rule_id = ?
                  AND status IN ('active', 'acknowledged')
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (rule_id,),
            ).fetchone()

        return self._row_to_alert(row) if row else None

    def get_alert_by_id(self, alert_id: int) -> Optional[Alert]:
        with self._lock:
            row = self.conn.execute(
                """
                SELECT *
                FROM alerts
                WHERE alert_id = ?
                """,
                (alert_id,),
            ).fetchone()

        return self._row_to_alert(row) if row else None

    def update_alert_acknowledged(self, alert_id: int, actor: str) -> Optional[Alert]:
        alert = self.get_alert_by_id(alert_id)
        if not alert:
            return None

        acknowledged_at = datetime.utcnow()

        with self._lock:
            self.conn.execute(
                """
                UPDATE alerts
                SET status = ?, acknowledged_by = ?, acknowledged_at = ?
                WHERE alert_id = ?
                """,
                ("acknowledged", actor, self._timestamp_to_storage(acknowledged_at), alert_id),
            )
            self.conn.commit()

        return self.get_alert_by_id(alert_id)

    def update_alert_resolved(self, alert_id: int, actor: str) -> Optional[Alert]:
        alert = self.get_alert_by_id(alert_id)
        if not alert:
            return None

        resolved_at = datetime.utcnow()

        with self._lock:
            self.conn.execute(
                """
                UPDATE alerts
                SET status = ?, resolved_by = ?, resolved_at = ?
                WHERE alert_id = ?
                """,
                ("resolved", actor, self._timestamp_to_storage(resolved_at), alert_id),
            )
            self.conn.commit()

        return self.get_alert_by_id(alert_id)

    def get_alerts(
        self,
        zone_id: Optional[str] = None,
        statuses: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ) -> List[Alert]:
        clauses = []
        params: List[object] = []

        if zone_id is not None:
            clauses.append("zone_id = ?")
            params.append(zone_id)

        if statuses is not None:
            placeholders = ", ".join("?" for _ in statuses)
            clauses.append(f"status IN ({placeholders})")
            params.extend(statuses)

        query = """
            SELECT *
            FROM alerts
        """

        if clauses:
            query += " WHERE " + " AND ".join(clauses)

        query += " ORDER BY created_at DESC"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        with self._lock:
            rows = self.conn.execute(query, params).fetchall()

        return [self._row_to_alert(row) for row in rows]

    def get_active_alerts(self, zone_id: Optional[str] = None) -> List[Alert]:
        return self.get_alerts(zone_id=zone_id, statuses=["active", "acknowledged"])

    def create_advisory(self, plant_name: str, zone_id: str, metric_type: str, message: str) -> Advisory:
        created_at = datetime.utcnow()

        with self._lock:
            cursor = self.conn.execute(
                """
                INSERT INTO advisories (plant_name, zone_id, metric_type, message, created_at, acknowledged)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (plant_name, zone_id, metric_type, message, self._timestamp_to_storage(created_at)),
            )
            self.conn.commit()

            return Advisory(
                advisory_id=cursor.lastrowid,
                plant_name=plant_name,
                zone_id=zone_id,
                metric_type=metric_type,
                message=message,
                created_at=created_at,
                acknowledged=False,
            )

    def get_advisories(self, limit: Optional[int] = None) -> List[Advisory]:
        query = """
            SELECT *
            FROM advisories
            ORDER BY created_at DESC
        """
        params: List[object] = []

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        with self._lock:
            rows = self.conn.execute(query, params).fetchall()

        return [self._row_to_advisory(row) for row in rows]

    def add_audit_log(self, event_type: str, actor: str, details: str) -> None:
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO audit_logs (event_type, actor, details, timestamp)
                VALUES (?, ?, ?, ?)
                """,
                (event_type, actor, details, self._timestamp_to_storage(datetime.utcnow())),
            )
            self.conn.commit()

    def get_audit_logs(self, limit: int = 100) -> List[Dict]:
        with self._lock:
            rows = self.conn.execute(
                """
                SELECT event_type, actor, details, timestamp
                FROM audit_logs
                ORDER BY log_id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        logs = [
            {
                "event_type": row["event_type"],
                "actor": row["actor"],
                "details": row["details"],
                "timestamp": row["timestamp"],
            }
            for row in rows
        ]
        return list(reversed(logs))

    def create_user(self, name: str, email: str, password_hash: str, role: str = "operator") -> User:
        normalized_email = email.strip().lower()
        created_at = datetime.utcnow()

        with self._lock:
            cursor = self.conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name.strip(), normalized_email, password_hash, role, self._timestamp_to_storage(created_at)),
            )
            self.conn.commit()

            return User(
                user_id=cursor.lastrowid,
                name=name.strip(),
                email=normalized_email,
                password_hash=password_hash,
                role=role,
                created_at=created_at,
            )

    def get_user_by_email(self, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()

        with self._lock:
            row = self.conn.execute(
                """
                SELECT *
                FROM users
                WHERE email = ?
                """,
                (normalized_email,),
            ).fetchone()

        return self._row_to_user(row) if row else None

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        with self._lock:
            row = self.conn.execute(
                """
                SELECT *
                FROM users
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()

        return self._row_to_user(row) if row else None

    def get_known_metrics_for_zone(self, zone_id: str) -> List[str]:
        query = """
            SELECT DISTINCT metric_type
            FROM (
                SELECT metric_type FROM alert_rules WHERE zone_id = ?
                UNION
                SELECT metric_type FROM sensor_readings WHERE zone_id = ?
                UNION
                SELECT metric_type FROM aggregated_metrics WHERE zone_id = ?
                UNION
                SELECT metric_type FROM alerts WHERE zone_id = ?
                UNION
                SELECT metric_type FROM advisories WHERE zone_id = ?
            )
            ORDER BY metric_type ASC
        """

        with self._lock:
            rows = self.conn.execute(query, (zone_id, zone_id, zone_id, zone_id, zone_id)).fetchall()

        return [row["metric_type"] for row in rows]

    def get_known_zones(self) -> List[str]:
        query = """
            SELECT DISTINCT zone_id
            FROM (
                SELECT zone_id FROM zone_plants
                UNION
                SELECT zone_id FROM alert_rules
                UNION
                SELECT zone_id FROM sensor_readings
                UNION
                SELECT zone_id FROM aggregated_metrics
                UNION
                SELECT zone_id FROM alerts
                UNION
                SELECT zone_id FROM advisories
            )
            ORDER BY zone_id ASC
        """

        with self._lock:
            rows = self.conn.execute(query).fetchall()

        return [row["zone_id"] for row in rows]
