# SCEMAS Backend

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The Flask server runs on `http://127.0.0.1:5000`.

## Demo Flow

1. Start the backend with `python app.py`
2. Start the client with `npm install` and `npm run dev`
3. Open the `Public Display` page in the client
4. Click `Start Feed` to begin the simulated telemetry stream

## Public API

The public API is read-only and has a lightweight in-memory rate limit of `60 requests / 60 seconds` per client.

- `GET /public/zones`
  Returns known zones plus currently known metrics and active alert counts.
- `GET /public/zones/<zone_id>/summary`
  Returns the latest aggregated metrics for one zone.
- `GET /public/metrics?zone_id=zone-central&metric_type=aqi&limit=20`
  Returns recent aggregate samples. All query parameters are optional.
- `GET /public/alerts?zone_id=zone-central&limit=8`
  Returns active or acknowledged alerts. Optional `status` values: `active`, `acknowledged`, `resolved`.

## Operator API

- `GET /operator/alerts?limit=25`
  Returns operator-visible alerts for the dashboard.
- `POST /operator/alerts/<alert_id>/ack`
  Acknowledges an active alert.
- `POST /operator/alerts/<alert_id>/resolve`
  Resolves an active or acknowledged alert.

## Admin API

- `GET /admin/audit`
- `GET /admin/advisories`
- `GET /admin/rules`
- `POST /admin/rules`

Example rule payload:

```json
{
  "zone_id": "zone-central",
  "metric_type": "humidity",
  "threshold": 75,
  "comparator": ">",
  "severity": "warning",
  "enabled": true
}
```

## Simulation API

- `POST /sim/start`
- `POST /sim/stop`
- `GET /sim/status`
