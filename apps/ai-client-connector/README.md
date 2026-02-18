# AI Client Connector

Client-side services for routing requests through your local IP, plus a startup golden-article capture task.

## Current scope

- Transparent forward HTTP proxy (no custom request/header mutation in app code)
- HTTPS tunneling via `CONNECT`
- Startup golden-article capture task (runs at most once every 2 hours via `state.json` key `goldenArticleLastSuccessAt`)

## Planned next scope

- Run Playwright with custom browser path/profile (manual login flow)
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

- `GOLDEN_ARTICLE_URL`
- `INNGEST_URL`

Optional:

- `PLAYWRIGHT_HEADLESS` (default `false`)
- `PLAYWRIGHT_BROWSER_PATH`
- `PLAYWRIGHT_USER_DATA_DIR`
- `PLAYWRIGHT_PROFILE_DIR`
