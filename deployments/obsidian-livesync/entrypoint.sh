#!/bin/sh
set -e

echo "--- Performing initial backup on container start ---"
backup.sh

echo "--- Initial backup complete. Starting cron daemon... ---"
# Start cron in the foreground. 'exec' replaces the shell process,
# making crond the main process (PID 1) for proper signal handling.
exec crond -f -l 8