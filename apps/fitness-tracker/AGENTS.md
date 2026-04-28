# Fitness Tracker

Unified fitness dashboard: Garmin health data (InfluxDB) + Ryot workout/body tracking (Postgres) + Grafana visualization.

## Upstream Sources

### garmin-grafana

The `src/garmin_grafana/` directory, `Dockerfile`, `pyproject.toml`, and `uv.lock` are sourced from:

- Repo: <https://github.com/arpanghosh8453/garmin-grafana>
- License: AGPL-3.0
- Pinned commit: `b45834db1ba4bb04d3a79485eaa53eb775d44160`

To sync updates from upstream, diff against that commit and apply relevant changes to `src/garmin_grafana/`.

### Ryot

Used as a Docker image (`ignisda/ryot:v10`), not vendored.

- Repo: <https://github.com/IgnisDa/ryot>
- License: GPL-3.0

## Stack

- `garmin-fetch-data` — Python container built from local Dockerfile. Fetches Garmin Connect data → InfluxDB.
- `influxdb` — InfluxDB 1.11 for Garmin time-series data.
- `ryot` — Ryot v10 for workout logging + body measurements. Uses shared `postgres_main` with database `ryot`.
- `grafana` — Grafana with two datasources: Garmin InfluxDB + Ryot Postgres.

## Key Files

- `src/garmin_grafana/garmin_fetch.py` — Main fetch loop (continuous + bulk modes)
- `src/garmin_grafana/fit_activity_importer.py` — Import local .FIT files
- `src/garmin_grafana/garmin_bulk_importer.py` — Import Garmin GDPR bulk export
- `src/garmin_grafana/influxdb_exporter.py` — Export InfluxDB data to CSV
- `grafana/datasources/datasources.yaml` — Provisioned datasources (InfluxDB + Postgres)
- `grafana/dashboards/Garmin-Grafana-Dashboard.json` — Pre-built Garmin dashboard
