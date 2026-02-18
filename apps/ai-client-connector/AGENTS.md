# AI Client Connector

Client-side Node.js service used to route outbound requests through the machine where this app runs.

## Purpose

- Provide a transparent forward HTTP proxy for `kb-backend` stock fetches.
- Ensure requests can originate from the client device IP (not server IP).
- Host upcoming browser interception workflows (Playwright + Brave profile).

## Current Scope

- Forward proxy using `proxy-chain` in `src/index.ts`.
- Supports HTTP proxying and HTTPS `CONNECT` tunneling.
- No custom request/header/body mutation in app code.
- Startup golden-article capture task with 2-hour state gate via `state.json` key `goldenArticleLastSuccessAt`.

## Non-Goals (for now)

- No authentication/authorization layer for proxy.
- No caching/retry/business logic in proxy path.
- No Playwright automation logic in `src/index.ts`.

## Technology Stack

- Runtime: Node.js >=24
- Language: TypeScript (ESM)
- Proxy library: `proxy-chain`
- Env schema: `@t3-oss/env-core` + `zod`

## Files

- `src/index.ts` - Proxy server entrypoint.
- `src/golden-article/intercept.ts` - Startup one-off capture + Inngest dispatch.
- `src/browser/context.ts` - Shared Playwright CDP attach setup for all browser automations.
- `src/infrastructure/state.ts` - Persist/read `state.json` for interval gating using only `goldenArticleLastSuccessAt`.
- `src/utils/logger.ts` - Shared structured logger.

## Scripts

- `pnpm dev` - Run proxy in watch mode (`tsx watch`).
- `pnpm build` - Compile TypeScript (`tsc`).
- `pnpm start` - Run compiled proxy from `dist/index.js`.
- `pnpm playwright` - Install Playwright browsers.

## Configuration

Environment variables (see `.env.example`):

- `AI_CLIENT_CONNECTOR_HOST` (default `0.0.0.0`)
- `AI_CLIENT_CONNECTOR_PORT` (default `8787`)
- `GOLDEN_ARTICLE_URL` (required for startup capture task)
- `INNGEST_URL` (required for startup dispatch)
- `PLAYWRIGHT_CDP_URL` (optional, default `http://127.0.0.1:9222`)

Integration target in `kb-backend`:

- `STOCK_HTTP_PROXY_URL=http://<client-ip-or-host>:8787`

## Implementation Rules

- Keep proxy pass-through by default.
- Do not add forced headers, origin spoofing, or body rewriting in the proxy layer.
- Keep Playwright interception logic in `src/playwright/*`, not mixed with proxy bootstrap.
- If adding request capture/forwarding later, gate it by explicit config and keep defaults transparent.

## User Preferences (High Priority)

- Prefer minimal, direct implementations over defensive abstraction.
- Follow direct user instructions literally unless there is a clear blocker.
- Use `@t3-oss/env-core` + `zod` directly for env parsing; avoid extra wrapper/parsing layers.
- Keep config surface small: only expose env vars that are actively needed.
- Use constants in code for stable operational values unless user explicitly asks for env configurability.
- Default browser automation to headful unless user explicitly requests headless mode.
- Persist only minimal state required by behavior (single-flag state when sufficient).

## Things To Avoid

- Overengineering (extra abstractions, helper layers, or “future-proofing” not requested).
- Broad state schemas when one field/flag is enough.
- Custom env preprocess/normalization helpers when plain schema fields are sufficient.
- Adding optional env flags “just in case”.
- Expanding scope beyond requested behavior without explicit approval.

## Upcoming Work Notes

Planned tasks to implement in separate modules:

1. Attach Playwright to an already-running browser over CDP.
2. Manual login flow by user (no credential automation).
3. Intercept golden article response payload and forward to configured endpoint.
4. Intercept stockbit.com request headers and forward to configured endpoint.

When implementing the above, preserve the proxy behavior as stable baseline functionality.
