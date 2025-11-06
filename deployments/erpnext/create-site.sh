#!/bin/bash

set -e

SITE_NAME=""
ADMIN_PASSWORD=""
DB_ROOT_PASSWORD="postgres"

usage() {
    echo "Usage: $0 --site-name <site-name> --admin-password <admin-password> [--db-root-password <db-password>]"
    echo ""
    echo "Options:"
    echo "  --site-name           Site name (e.g., erp.example.com)"
    echo "  --admin-password      Administrator password"
    echo "  --db-root-password    Database root password (default: postgres)"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --site-name)
            SITE_NAME="$2"
            shift 2
            ;;
        --admin-password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        --db-root-password)
            DB_ROOT_PASSWORD="$2"
            shift 2
            ;;
        *)
            usage
            ;;
    esac
done

if [ -z "$SITE_NAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
    usage
fi

echo "Setting up PostgreSQL credentials..."
docker compose exec backend bench set-config -g root_login postgres
docker compose exec backend bench set-config -g root_password "$DB_ROOT_PASSWORD"

echo "Creating site: $SITE_NAME"
docker compose exec backend bench new-site \
    --db-type postgres \
    --admin-password "$ADMIN_PASSWORD" \
    "$SITE_NAME"

echo "Installing ERPNext app..."
docker compose exec backend bench --site "$SITE_NAME" install-app erpnext

echo ""
echo "Site created successfully!"
echo "Access your site at: http://localhost:8014"
echo "For Nginx Proxy Manager, configure:"
echo "  - Forward Hostname/IP: <tailscale-ip>"
echo "  - Forward Port: 8014"
echo "  - Enable 'Websockets Support'"
