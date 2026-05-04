#!/bin/sh
set -e

# Source env vars when running under cron
[ -f /etc/environment ] && export $(cat /etc/environment | xargs)

TIMESTAMP=$(date +%F_%H-%M)
BACKUP_DIR="/backups/${TIMESTAMP}"

echo "Starting InfluxDB backup of '${INFLUXDB_DATABASE}' to ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"
influxd backup -portable -db "${INFLUXDB_DATABASE}" -host "${INFLUXDB_HOST}:8088" "${BACKUP_DIR}"
echo "Backup successful: ${BACKUP_DIR}"

echo "Cleaning up backups older than ${CLEANUP_DAYS:-30} days..."
find /backups -maxdepth 1 -type d -mtime "+${CLEANUP_DAYS:-30}" ! -path /backups -exec rm -rf {} \;
echo "Cleanup complete."
