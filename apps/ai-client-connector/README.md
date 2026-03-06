# AI Client Connector

Client-side services for routing requests through your local IP, plus startup browser capture tasks.

## Current scope

- Transparent forward HTTP proxy (no custom request/header mutation in app code)
- HTTPS tunneling via `CONNECT`
- Startup golden-article capture task (runs at most once every 2 hours via `state.json` key `goldenArticleLastSuccessAt`)
- Startup Stockbit request-header capture task (runs every startup and sends captured headers to kb-backend)
- Startup Stockbit portfolio/history capture task
- Connector-owned Stockbit normalization into `AI_CONNECTOR_DATA_ROOT`

## Planned next scope

- Keep CDP-attached Playwright flow for manual-login browser automation
- Capture golden-article response payload and forward to endpoint
- Capture request headers from stockbit.com and forward to endpoint

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Build and run

```bash
pnpm build
pnpm start
```

## Configure kb-backend to use this proxy

In `kb-backend`, point proxy URL to this connector:

```bash
STOCK_HTTP_PROXY_URL=http://<client-ip-or-host>:8787
```

If `kb-backend` uses `HttpProxyAgent`/`HttpsProxyAgent`, requests will exit using the client machine network where this app runs.

## Golden article env

Required:

- `KB_BACKEND_URL` (default `https://kb.akbarmr.dev`)
- `AI_CLIENT_CONNECTOR_PUBLIC_PROXY_URL`
- `GOLDEN_ARTICLE_URL`
- `INNGEST_URL`
- `AI_CONNECTOR_DATA_ROOT` (base path for raw and normalized Stockbit data)

Optional:

- `PLAYWRIGHT_CDP_URL` (default `http://127.0.0.1:9222`)
- `PLAYWRIGHT_BROWSER_PATH`
- `PLAYWRIGHT_USER_DATA_DIR`
- `PLAYWRIGHT_PROFILE_DIR`

## Browser Startup Behavior

On app startup, connector will:

1. Try connecting to CDP
2. If CDP is reachable: reuse existing browser instance (no restart)
3. If CDP is unreachable: close Brave, relaunch with remote debugging, then connect
4. Run golden-article interception task
5. Run stockbit header interception task
6. Run Stockbit portfolio/history capture and normalization task

## Stockbit Portfolio Data Output

When `AI_CONNECTOR_DATA_ROOT` is set, Stockbit data is written under:

```text
{AI_CONNECTOR_DATA_ROOT}/stockbit/
├── raw/
│   ├── portfolio/YYYY-MM-DD/HHMMSS.json
│   ├── history/YYYY-MM-DD/HHMMSS_page-N.json
│   └── history-backfill/YYYY-MM-DD/page-XXX.json
└── normalized/
    ├── latest_portfolio.json
    ├── trades.jsonl
    ├── latest_snapshot.json
    └── backfill_state.json
```

Manual history backfill:

1. Intercept multiple Stockbit history responses manually.
2. Save them under `raw/history-backfill/YYYY-MM-DD/` using stable names like `page-001.json`, `page-002.json`, and so on.
3. Restart the connector or rerun the capture task.
4. Connector derives deterministic `captured_at` timestamps from the `YYYY-MM-DD` directory plus the `page-XXX.json` number, then ingests valid files into `normalized/trades.jsonl` with deterministic dedupe.
