#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# Format the filename with a timestamp (e.g., obsidiannotes-2025-09-08T23-17-35.txt.gz)
FILENAME="/backup/${COUCH_DATABASE}-$(date +"%Y-%m-%dT%H-%M-%S").txt.gz"

echo "Starting backup of '${COUCH_DATABASE}' to ${FILENAME}"

# Run the backup, piping the output to gzip for compression
# Credentials and host are passed via the COUCH_URL variable
couchbackup --url "${COUCH_URL}" --db "${COUCH_DATABASE}" | gzip > "${FILENAME}"

echo "Backup successful: ${FILENAME}"

# --- Cleanup old backups ---
# Find and delete backup files older than CLEANUP_DAYS
echo "Cleaning up backups older than ${CLEANUP_DAYS} days..."
find /backup -name "*.txt.gz" -mtime "+${CLEANUP_DAYS}" -exec rm {} \;
echo "Cleanup complete."