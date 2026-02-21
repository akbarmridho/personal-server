# AI Client Connector

Client-side services for routing requests through your local IP, plus startup browser capture tasks.

## Current scope

- Transparent forward HTTP proxy (no custom request/header mutation in app code)
- HTTPS tunneling via `CONNECT`
- Startup golden-article capture task (runs at most once every 2 hours via `state.json` key `goldenArticleLastSuccessAt`)
- Startup general-news proxy queue flush trigger (runs at most once every 1 hour via `state.json` key `generalNewsProxyQueueFlushLastSuccessAt`)
- Startup Stockbit request-header capture task (runs every startup and sends captured headers to kb-backend)
- Startup WhatsApp channel crawl task (runs at most once every 1 hour via `state.json` key `whatsappChannelLastSuccessAt`)

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
- `WHATSAPP_CHANNEL_JID` or `WHATSAPP_CHANNEL_INVITE_CODE`

Optional:

- `PLAYWRIGHT_CDP_URL` (default `http://127.0.0.1:9222`)
- `WHATSAPP_AUTH_STATE_DIR` (default `<app-root>/.whatsapp-auth`)
- `PLAYWRIGHT_BROWSER_PATH`
- `PLAYWRIGHT_USER_DATA_DIR`
- `PLAYWRIGHT_PROFILE_DIR`

## WhatsApp Login Setup

1. Set `INNGEST_URL` and channel config (`WHATSAPP_CHANNEL_JID` or invite code URL).
2. Start connector with `pnpm dev` or `pnpm start`.
3. On first run, scan the QR printed in terminal to login WhatsApp.
4. Auth credentials are persisted under `.whatsapp-auth` for next runs.

## Browser Startup Behavior

On app startup, connector will:

1. Try connecting to CDP
2. If CDP is reachable: reuse existing browser instance (no restart)
3. If CDP is unreachable: close Brave, relaunch with remote debugging, then connect
4. Run golden-article interception task
5. Trigger general-news proxy queue flush event
6. Run stockbit header interception task
7. Run WhatsApp channel fetch (latest 10 messages) and dispatch to Inngest
