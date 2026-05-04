#!/bin/sh
set -e

# Debian cron doesn't inherit container env vars — dump them for cron jobs
printenv | grep -E '^(INFLUXDB_|CLEANUP_|TZ)' > /etc/environment

echo "--- Performing initial backup on container start ---"
/usr/local/bin/backup.sh

echo "--- Initial backup complete. Starting cron daemon... ---"
exec cron -f
