#!/bin/bash
# Script to restart nginx-proxy-manager container
# This script is intended to be run via cron at 19:00 UTC daily

# Restart the nginx-proxy-manager container
echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - Restarting nginx-proxy-manager..."
docker restart nginx-nginx-proxy-manager-1

# Check if the restart was successful
if [ $? -eq 0 ]; then
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - nginx-proxy-manager restarted successfully"
else
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - ERROR: Failed to restart nginx-proxy-manager"
    exit 1
fi
