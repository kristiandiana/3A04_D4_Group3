# SCEMAS Backend

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend now persists data in `server/scemas.db` by default. Override it with `SCEMAS_DB_PATH`.

## Default Accounts

- Admin: `admin@scemas.local` / `Admin123!`
- Operator: `operator@scemas.local` / `Operator123!`

New signups are created with the `operator` role.

## Auth / RBAC

- `POST /login`
- `POST /signup`
- `GET /me`

Protected routes require `Authorization: Bearer <token>`.

- Operator or admin:
  - `GET /operator/alerts`
  - `POST /operator/alerts/<alert_id>/ack`
  - `POST /operator/alerts/<alert_id>/resolve`
  - `POST /sim/start`
  - `POST /sim/stop`
  - `POST /sim/transport`
- Admin only:
  - `GET /admin/audit`
  - `GET /admin/advisories`
  - `GET /admin/rules`
  - `POST /admin/rules`

## Persistence + Aggregation

- Raw telemetry is stored in SQLite in `sensor_readings`
- Fixed window aggregates are persisted in `aggregated_metrics`
- Supported aggregate windows:
  - `5min` for 5-minute averages
  - `hourly` for hourly maximum/history views

Public metrics endpoint example:

```bash
curl "http://127.0.0.1:5000/public/metrics?zone_id=zone-central&window_type=hourly&limit=10"
```

Zone summary example:

```bash
curl "http://127.0.0.1:5000/public/zones/zone-central/summary"
```

## MQTT Ingestion

MQTT ingestion is optional and disabled by default unless configured.

Environment variables:

- `SCEMAS_MQTT_ENABLED=true`
- `SCEMAS_MQTT_BROKER_HOST=127.0.0.1`
- `SCEMAS_MQTT_BROKER_PORT=1883`
- `SCEMAS_MQTT_TOPIC=scemas/readings`
- `SCEMAS_MQTT_USERNAME=...`
- `SCEMAS_MQTT_PASSWORD=...`
- `SCEMAS_SIM_TRANSPORT=direct` or `mqtt`

Expected MQTT JSON payload:

```json
{
  "sensor_id": "aq-001",
  "zone_id": "zone-central",
  "metric_type": "aqi",
  "value": 142.5,
  "unit": "index",
  "timestamp": "2026-04-05T12:00:00"
}
```

Use `GET /sim/status` to inspect simulator state plus MQTT subscriber status.
