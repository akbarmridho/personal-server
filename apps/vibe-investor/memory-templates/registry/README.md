# Registry Contract

`memory/registry/` holds derived machine-readable current-state files.

Rules:

- Registry files are derived views, not source of truth.
- Durable truth for symbols and theses lives in `../state/`.
- Portfolio live truth still lives in portfolio tools, not registry files.
- Refresh registry after workflows that mutate symbol, thesis, or watchlist state.
- If registry conflicts with durable state, fix the registry from durable state instead of editing around the conflict.

Files:

- `state.json` — top-level snapshot summary
- `symbols.json` — symbol-level current state
- `theses.json` — thesis-level current state
