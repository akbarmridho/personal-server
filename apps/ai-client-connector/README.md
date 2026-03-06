# AI Client Connector

Client-side services for routing requests through your local IP, plus startup browser capture tasks.

## Current scope

- Transparent forward HTTP proxy (no custom request/header mutation in app code)
- HTTPS tunneling via `CONNECT`
- Startup golden-article capture task (runs at most once every 2 hours via `state.json` key `goldenArticleLastSuccessAt`)
- Startup Stockbit request-header capture task (runs every startup and sends captured headers to kb-backend)
- Startup Stockbit portfolio/history raw capture task (writes raw JSON artifacts under `OPENCODE_DATA_HOME`)

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

Optional:

- `OPENCODE_DATA_HOME` (recommended, used as the base path for raw Stockbit captures and connector state)
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
6. Run Stockbit portfolio/history raw capture task

## Stockbit Raw Capture Output

When `OPENCODE_DATA_HOME` is set, raw Stockbit captures are written under:

```text
{OPENCODE_DATA_HOME}/data/ai-client-connector/stockbit/
├── portfolio/YYYY-MM-DD/HHMMSS.json
├── history/YYYY-MM-DD/HHMMSS_page-N.json
└── manifests/YYYY-MM-DD/HHMMSS.json
```
