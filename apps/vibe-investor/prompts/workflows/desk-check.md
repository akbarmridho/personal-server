# Desk Check Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `desk-check`.

Command input may narrow symbol focus, tighten the date window, or add output emphasis if that remains compatible with this contract. Include `skip-digest` in command input to skip Phase 1 (useful for mid-day re-checks or when digest was already run).

## Phases

### Phase 1: News Digest + Sync (skip with `skip-digest`)

Gather and integrate new information before reviewing.

1. **Digest collection.** Gather high-signal news/documents since the last successful digest run.
   - Data collection is complete only after all paginated `list-documents` results in the window are exhausted for `types: ["news", "analysis", "rumours"]`, relevant documents are read with `get-document`, and any extra web search is used only for material continuity.
   - Social signal collection is delegated to a subagent (see below) to avoid polluting the parent context with noise.
   - Continuity: before collecting, read the latest file in `memory/digests/` to determine the prior coverage window endpoint. Set `date_from` to that endpoint when calling `list-documents`. This captures everything from the prior endpoint through today, including documents scraped on the current day.
   - Max lookback: if the prior digest is more than 7 calendar days old, cap `date_from` at 7 days ago and note the gap in the digest header.
   - Digest date: use today's calendar date (`YYYY-MM-DD` in WIB), not `TRADING_DAY`. News and analysis arrive on weekends and holidays too.
   - Write the digest artifact to `memory/digests/{CALENDAR_DATE}_news_digest.md`.
   - Document references: every document cited in the digest must use the full document ID as returned by tools. Never truncate or shorten UUIDs.

   **Social signal subagent** (delegated via `task`, runs in parallel with document collection):
   - Spawn with: `task(agent: "vibe-investor", prompt: "<social signal prompt below>")`
   - Runs the Twitter list CLI (`TWITTER_BROWSER=brave twitter list 2045405839251636551 --yaml --filter --max 100`) and `get-stockbit-stream` for today's date.
   - Triages both sources: filter by relevance to portfolio/watchlist symbols, active theses, and high engagement (Twitter score >50, Stockbit likes >50).
   - For high-signal tweets, fetches full thread with `twitter tweet {ID} --yaml --max 20`.
   - Returns a compact social signal summary to the parent: key themes, symbol mentions, sentiment shifts, rotation signals, insider/institutional chatter. Max 2,000 bytes.
   - The parent integrates this into the digest under a "Social Signals" section. The raw social data stays in the subagent context and is discarded.

   Social signal subagent prompt template:

   ```
   You are a social signal triage subagent. Collect and filter social signals for the desk-check digest.

   Portfolio symbols: {list from portfolio_state}
   Watchlist symbols: {list of READY + WATCHING from get_state}
   Active theses: {list from get_state}
   Date: {CALENDAR_DATE}

   Steps:
   1. Run: TWITTER_BROWSER=brave twitter list 2045405839251636551 --yaml --filter --max 100
   2. Run: get-stockbit-stream for today's date
   3. Filter both by: relevance to portfolio/watchlist symbols, active theses, high engagement (Twitter score >50, Stockbit likes >50)
   4. For high-signal tweets, fetch full thread: TWITTER_BROWSER=brave twitter tweet {ID} --yaml --max 20
   5. Return a compact summary (max 2,000 bytes): key themes, symbol mentions, sentiment shifts, rotation signals, insider/institutional chatter.

   Do NOT write any files. Return your summary as text output only.
   ```

   Digest output structure:
   - Header: date, coverage window (from → to, inclusive of today), prior digest path referenced for continuity.
   - Collection note: state how many documents were found per type and whether pagination was exhausted.
   - Topline regime read: what is the current market posture? What changed versus the prior digest? Be honest about what is and isn't repaired.
   - Thesis impact map: for each active thesis, state what changed this window and whether the thesis is strengthening, weakening, or unchanged. Include reasoning, not just labels.
   - Watchlist and portfolio-relevant flags: material changes to holdings, `READY`, `WATCHING`, `SHELVED`, or `ARCHIVED` symbols. Flag missed entries, unresolved actions, and status items needing human decision. Explicitly list any `SHELVED` or `ARCHIVED` symbols with material news so they are included in the Phase 3 coverage universe.
   - Commodity and macro data: key prices and macro developments relevant to active theses.
   - What to read: curated list of the highest-signal documents from this window, grouped by theme, with full document IDs and one-line descriptions of why each matters.
   - Bottom line: one paragraph synthesizing the net change in market posture, thesis health, and what the human should focus on.

2. **Digest sync.** After writing the digest, immediately sync memory. This is not optional.
   - Load active theses from `get_state` output and the digest just written.
   - For each active thesis: compare digest findings against the thesis file. If the digest contains evidence that changes timeline, status, scenario branches, or key assumptions, update `memory/theses/{THESIS_ID}/thesis.md` with the new evidence and link to the source document IDs.
   - For each symbol mentioned in the digest with material changes: update `memory/symbols/{SYMBOL}/plan.md` with evidence-backed status or trigger changes.
   - If evidence is ambiguous, mark `Needs Verification` in the relevant file — do not silently skip.
   - Produce a sync summary listing: which files were updated and why, which theses were reviewed but unchanged (one line each), and any items marked `Needs Verification`.

### Phase 2: Portfolio + Market Context

- Run `market-pulse` first. This returns trending stocks, market movers, preset screeners, and per-symbol watchlist pulse (batch OHLCV + memory context + deterministic alerts) in one call. Use the output to:
  - Triage the coverage universe: symbols with Tier 1-2 alerts get priority review. `NO_CHANGE` symbols with no alerts can be skimmed.
  - Identify market-level signals: trending names, foreign flow direction, screener hits (52w highs/lows, volume breakouts, foreign flow uptrend).
  - Cross-reference screener hits against the watchlist — flag any watchlist/portfolio symbol appearing in screeners.
  - Feed the alert-sorted items into Phase 3 delegation: batch symbols by alert urgency and theme affinity.
- Run `portfolio-management` for holdings, discipline, and IHSG cash-overlay checks using `portfolio_state` summary plus targeted `portfolio_trade_history` / `portfolio_symbol_trade_journey` calls and current IHSG context.
- Mandatory memory context: `memory/market/plan.md`, all other `.md` files in `memory/market/` (list and read), all files in `memory/notes/` (list and read), and `get_state`. Surface any `get_state` warnings (staleness, status mismatches) in the synthesis output.

### Phase 3: Symbol Reviews (delegated via `task` tool)

- Coverage universe: holdings from `portfolio_state`, plus all `READY` symbols, plus all `WATCHING` symbols, plus any `SHELVED` or `ARCHIVED` symbol flagged by the digest in Phase 1 with material news.
- Before delegating each batch, check which symbols are missing artifacts. Subagents must produce all required artifacts (`plan.md`, `narrative.md`, `fundamental.md`, context JSONs, chart PNGs) for every symbol they review.
- Group the coverage universe into batches of 3-5 symbols by theme, sector, or thesis affinity when possible and delegate each batch to a subagent using `task(agent: "vibe-investor", prompt: "<symbol batch prompt>")`. Each subagent calls `get-stock-profile` once per symbol before any analysis, then runs `technical-analysis`, `flow-analysis`, and `narrative-analysis` for its assigned symbols, reads `memory/symbols/README.md` for the plan template, and writes retained artifacts (`plan.md`, `narrative.md`, charts `*.png`, context JSON) to `memory/symbols/{SYMBOL}/` before returning. On UPDATE mode, subagents use `edit` for surgical changes to existing `plan.md` and `narrative.md` instead of full rewrites. The parent agent must not run symbol-level TA/flow/narrative inline.
- Top-down market review is a separate `task` call, run in parallel with symbol batches. The market subagent runs `technical-analysis` on IHSG and `narrative-analysis` at the market level, writes the IHSG Technical lens summary into `plan.md` and `narrative.md` to `memory/market/`. See `memory/market/README.md` for the contract. The subagent returns a structured summary (IHSG regime, key levels, macro tone, regime change signals) for the parent synthesis.
- Spawn all `task` calls (symbol batches + market subagent) in the same turn for parallel execution. Do not wait for one batch to finish before starting the next.
- Flow analysis should fetch broker-flow plus OHLCV, build deterministic `flow_context`, and reason from that packet rather than from raw broker tables.
- Flow analysis is most relevant when the symbol is actively held or near actionable review, sponsor behavior could change conviction materially, or parent synthesis needs lead / confirm / warning context versus TA.
- Narrative analysis prioritizes new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.

Symbol batch subagent prompt template:

```
You are a symbol review subagent for the desk-check workflow.

Assigned symbols: {SYMBOL_1}, {SYMBOL_2}, {SYMBOL_3}
Mode: UPDATE (all have existing plan.md)
Trading day: {TRADING_DAY}
IHSG context: {1-2 sentence regime summary from Phase 2}
Digest context: {relevant thesis impact lines from Phase 1 digest for these symbols}

For each symbol:
1. Call get-stock-profile once.
2. Load and run technical-analysis skill (fetch OHLCV, preprocess, write ta_context.json + chart_evidence.json + chart PNGs).
3. Load and run flow-analysis skill (fetch broker-flow + OHLCV, preprocess, write flow_context.json).
4. Load and run narrative-analysis skill (query list-documents for recent analysis/news, write narrative.md updates).
5. Read memory/symbols/README.md for the plan template.
6. Read existing plan.md, then use edit calls to update: frontmatter last_reviewed, lens scores, lens state paragraphs (only if materially changed), history entries (only if new reasoning).
7. If any required artifact is missing (plan.md, narrative.md, fundamental.md, context JSONs, chart PNGs), create it.

Return a structured summary per symbol: { symbol, urgency, lens_scores, key_finding, alerts }.
Write symbol artifacts to memory/symbols/{SYMBOL}/. Write intermediate work to work/.
Do NOT write to memory/market/, memory/notes/, or memory/theses/.
```

Market subagent prompt template:

```
You are the market review subagent for the desk-check workflow.

Trading day: {TRADING_DAY}
Current market/plan.md summary: {key lines from Phase 2 market plan read}

Steps:
1. Load and run technical-analysis skill on IHSG (fetch OHLCV, preprocess, write IHSG_ta_context.json + IHSG_chart_evidence.json + chart PNGs to memory/market/).
2. Load and run narrative-analysis skill at market level (query list-documents for market-level analysis/news).
3. Update memory/market/plan.md IHSG Technical section and memory/market/narrative.md with fresh data using edit calls.
4. Return structured summary: { ihsg_close, ihsg_change, regime, key_levels, macro_tone, regime_change_signals }.

Write market artifacts to memory/market/. Write intermediate work to work/.
Do NOT write to memory/symbols/, memory/notes/, or memory/theses/.
```

### Phase 4: Synthesis

Parent synthesis produces two outputs: (1) **chat output** — the full synthesis shown to the human, and (2) **desk-check artifact** — a lean session index saved to file.

#### Chat output (shown to human)

Full synthesis for each reviewed symbol, triaged by urgency per main.md:

- Use `market-pulse` alert triage as the starting point for urgency classification. Symbols with Tier 1-2 alerts map to `ATTENTION` or `EXIT_SIGNAL`. Tier 3 maps to `MONITOR`. No alerts or Tier 4 only map to `NO_CHANGE` unless subagent review escalates.
- `NO_CHANGE` symbols: one-line status in a summary table.
- `MONITOR` symbols: brief note on what shifted and what to watch.
- `ATTENTION` and `EXIT_SIGNAL` symbols: full `symbol_review` per main.md contract.

The synthesis must:

- Start with a digest summary (unless `skip-digest`): topline regime change, key thesis impacts, and any human-attention items from the digest. The human should not need to open the digest file separately to know what happened.
- State the active thesis and whether it is intact, strengthening, weakening, or invalidated.
- Reconcile the technical risk map with broker-flow context, thesis quality, narrative changes, optional scenario branches, and any portfolio hard rail or size-cap constraint.
- Surface tensions between lenses honestly — do not collapse them into a single verdict.
- End each symbol review with `human_attention`: what the human needs to decide or be aware of.
- For holdings: flag any deterioration, thesis drift, or exit signals. When all lenses converge negative, state the exit case directly.
- For watchlist symbols: flag material changes, new catalysts, or thesis invalidation.
- Thesis status evaluation: for each thesis touched by this desk-check (via symbol reviews or digest sync), evaluate whether the current `status` (`ACTIVE` / `DORMANT` / `INACTIVE`) is still correct. If a thesis has no active catalyst, no recent evidence, and no symbol showing momentum, suggest downgrade to `DORMANT`. If a thesis is invalidated or all linked symbols have exited/been archived, suggest `INACTIVE`. Present status change suggestions to the human — do not auto-change thesis status.

#### Desk-check artifact (saved to file)

The desk-check artifact (`memory/digests/{CALENDAR_DATE}_desk_check.md`) is a **session index**, not a full analysis report. Full symbol analysis lives in each symbol's `plan.md`. The artifact captures only what's unique to the session: triage, human decisions, and thesis health.

Target: 1,500-3,000 bytes. Maximum: 4,000 bytes. If bigger, symbol reviews are leaking in.

```markdown
# Desk-Check — {YYYY-MM-DD}

**IHSG:** {close} ({change}) | Regime: {regime} ({aggression}) | Cash: {pct}%

## Digest Headline

{2-3 sentences: the most important thing from today's news digest. Not a restatement of the full digest — just the headline that matters for positioning.}

## Triage

| Symbol | Urgency | Score Δ | One-liner |
|--------|---------|---------|-----------|
| {SYM} | {ATTENTION/MONITOR/NO_CHANGE} | {lens score changes} | {1 sentence: what changed and why it matters} |

## Human Decisions

{Numbered list of decisions the human needs to make or has made. Mark resolved decisions with ✅. This is the most valuable section — it's the action log.}

1. **{SYMBOL}:** {decision needed or made}

## Thesis Health

| Thesis | Status | Change? | Note |
|--------|--------|---------|------|
| {thesis} | {ACTIVE/DORMANT} | {→ DORMANT? / —} | {1 sentence} |

## Executed

{Only if trades were executed this session. Otherwise omit.}

- {what was done}

---

*Next: {YYYY-MM-DD} ({context for next session})*
```

What does NOT go in the desk-check artifact (lives elsewhere):

- Full `symbol_review` YAML blocks → `plan.md` lens summaries
- Portfolio snapshot/constraints → queryable via `portfolio_state`
- Market review → `market/plan.md`
- Key tensions → `plan.md` lens summaries and `narrative.md` Tensions
- Near-term catalysts → `market/plan.md`

On every successful run, update `memory/market/plan.md` if the market context changed materially.

## Artifacts

- Symbol artifacts must include at least `plan.md`, `narrative.md`, and important chart/evidence artifacts (`*.png`, context JSON). Write `fundamental.md` when fundamental analysis is run for the symbol.
- Digest artifact at `memory/digests/{CALENDAR_DATE}_news_digest.md` (Phase 1).
- Desk-check artifact at `memory/digests/{CALENDAR_DATE}_desk_check.md` — lean session index per the Phase 4 template. Not a full analysis report.
- If a possible fundamental break is detected, record `Needs Manual Fundamental Review` instead of launching a full fundamental workflow inline.
