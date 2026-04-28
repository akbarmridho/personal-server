# Fitness Tracker

Unified fitness dashboard combining Garmin health data, Ryot workout logging, and body composition tracking via Grafana.

## Architecture

```
Grafana (:8028)
├── Garmin Dashboard (InfluxDB) — HR, sleep, steps, stress, activities, strength sets
└── Ryot Postgres — workouts, body measurements (InBody)

Ryot (:8027) — PWA for logging workouts + body measurements at the gym
```

## Services

| Service | Port | Purpose |
|---|---|---|
| Ryot | 8027 | Workout & measurement tracker (PWA) |
| Grafana | 8028 | Unified dashboard |
| InfluxDB | internal | Garmin time-series data |
| garmin-fetch-data | internal | Auto-fetches from Garmin Connect every 5min (built locally) |

Ryot uses the shared `postgres_main` from `deployments/postgres` with database `ryot`.

## Setup

```bash
# Create Ryot database in shared postgres
docker exec -it postgres_main psql -U postgres -c "CREATE DATABASE ryot;"

# Create token directory
mkdir -p garminconnect-tokens
chown -R 1000:1000 garminconnect-tokens

# Copy and edit env (set Garmin email + base64-encoded password)
cp .env.example .env
# Encode your Garmin password: echo -n 'your_password' | base64

# Start all services
docker compose up -d
```

If you have 2FA enabled on Garmin Connect, the first run will still prompt for the MFA code interactively. Run `docker compose run --rm garmin-fetch-data` once to complete the 2FA flow, then `docker compose up -d` for continuous mode.

## Garmin Scripts

### garmin_fetch.py — Main data fetcher

The core script that runs continuously inside the container. Authenticates with Garmin Connect, fetches health data (HR, sleep, steps, stress, activities, strength sets, body composition, etc.), and writes it to InfluxDB. Runs in two modes:

- **Continuous** (default): checks every 5 minutes for new synced data from the watch.
- **Bulk**: fetches a date range then exits. Set `MANUAL_START_DATE` to trigger.

### Historical backfill

```bash
docker compose run --rm \
  -e MANUAL_START_DATE=YYYY-MM-DD \
  -e MANUAL_END_DATE=YYYY-MM-DD \
  garmin-fetch-data
```

### fit_activity_importer.py — Import local .FIT files

Imports a single `.fit` file (from Garmin Connect export or directly from the watch) into InfluxDB without going through the Garmin API. Parses the FIT file locally for activity summary + GPS/HR/pace data.

```bash
# Copy the .fit file into the container, then import
docker cp /path/to/activity.fit fitness_garmin_fetch:/fit_file.fit
docker compose exec garmin-fetch-data python /app/garmin_grafana/fit_activity_importer.py --fit_file /fit_file.fit

# Dry run (print parsed data without writing to InfluxDB)
docker compose exec garmin-fetch-data python /app/garmin_grafana/fit_activity_importer.py --fit_file /fit_file.fit --dry_run
```

### garmin_bulk_importer.py — Import Garmin bulk export

Imports data from a full Garmin Connect data export (GDPR-style zip with JSON + FIT files). Reads local files instead of hitting the API, useful for importing years of history without rate limits.

```bash
# Mount your extracted bulk export directory and run
docker compose run --rm \
  -v /path/to/garmin-export:/bulk_export \
  -e MANUAL_START_DATE=2020-01-01 \
  garmin-fetch-data \
  python /app/garmin_grafana/garmin_bulk_importer.py --bulk_data_path /bulk_export --start_date 2020-01-01
```

### influxdb_exporter.py — Export data to CSV

Exports InfluxDB data as CSV files in a zip archive. For feeding into LLMs, spreadsheets, or custom analysis.

```bash
# Export last 30 days (default)
docker compose exec garmin-fetch-data python /app/garmin_grafana/influxdb_exporter.py

# Export last 7 days
docker compose exec garmin-fetch-data python /app/garmin_grafana/influxdb_exporter.py --last-n-days=7

# Export specific range
docker compose exec garmin-fetch-data python /app/garmin_grafana/influxdb_exporter.py \
  --start-date=2025-01-01 --end-date=2025-03-01

# Copy the exported zip to your host
docker cp fitness_garmin_fetch:/tmp/GarminStats_Export_XXXXX.zip ./
```

## Grafana → Ryot Postgres Queries

Body measurements (InBody data):

```sql
SELECT
  timestamp AS time,
  (stat->>'value')::numeric AS value,
  stat->>'name' AS metric
FROM user_measurement,
  jsonb_array_elements(information->'statistics') AS stat
WHERE stat->>'name' IN ('weight', 'body_fat', 'skeletal_muscle_mass')
ORDER BY timestamp
```

Workout history:

```sql
SELECT start_time AS time, name, duration / 60 AS duration_min, calories_burnt
FROM workout
ORDER BY start_time
```

## Update

```bash
docker compose down
docker compose build --pull
docker compose up -d
```

## Credits

Garmin data fetching: forked from [garmin-grafana](https://github.com/arpanghosh8453/garmin-grafana) by [@arpanghosh8453](https://github.com/arpanghosh8453) (AGPL-3.0).
Upstream pinned at commit [`b45834d`](https://github.com/arpanghosh8453/garmin-grafana/commit/b45834db1ba4bb04d3a79485eaa53eb775d44160).
Workout tracking: [Ryot](https://github.com/IgnisDa/ryot) by [@IgnisDa](https://github.com/IgnisDa) (GPL-3.0).
