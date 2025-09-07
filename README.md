# Personal Server

## Todo

- Active Pieces (https://github.com/activepieces/activepieces/)
- Setup NGINX Proxy Manager
- Setup Immich -> gak bisa pake network storage filen? https://immich.app/docs/guides/custom-locations/

## Docker Network

```bash
docker network create personal_network
```

## Port List

### Filen

- `4001` as WebDAV Server.

### Adguard Home

- `53 (TCP/UDP)` DNS Server.
- `8000 (TCP)` Admin Dashboard.

### PostgreSQL

- `5433` PostgreSQL.
- `8001 (TCP)` pgweb Dashboard.

### RSS Feed

- `8002 (TCP)` mkfd.
- `8003 (TCP)` miniflux.

### Kavita

- `8004 (TCP)` Kavita.
