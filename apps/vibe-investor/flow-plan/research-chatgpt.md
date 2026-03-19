# Broker-Flow Method Research for Indonesian Stocks Using Daily Top-25 Broker Summaries

## Executive Summary

- Daily “broker summary” data in Indonesian equities is widely described by brokers/platforms as a recap of buy/sell activity by broker (sekuritas) over a chosen period. That framing aligns with your raw contract (daily snapshots, gross mode), and it supports building *flow evidence* without turning it into a second chart engine. citeturn9view0turn8search0turn9view2  
- **CADI is not a globally standardized indicator name**; in Indonesian “broker-flow” practice it appears as a *product-specific* label for a **cumulative broker-imbalance line** (cumulative net activity from “dominant” brokers, often filtered to top-N brokers by absolute net). This is implementable, but its exact meaning depends on top-N selection, normalization, and truncation handling. citeturn4view0turn5search3  
- **VWAP as a benchmark is strongly standard** (VWAP = total traded value / total traded volume) and is commonly used to assess execution quality. However “broker-side VWAP execution quality” from daily broker summaries is an *approximate* aggressiveness proxy (not true order aggressiveness or bid/ask capture). Use it deterministically, but treat thresholds as **calibrated heuristics** rather than canonical market standards. citeturn0search13turn4view0  
- **GVPR** (“Gross Volume Participation Ratio”) is *not* a universally standard term for “top-5 share,” but it matches a **standard concentration-ratio/participation idea**: “how much of activity is done by the biggest participants.” With daily top-25-per-side data, **top-k share metrics are among the most robust** because “top brokers” are exactly what you reliably observe. Still, multi-day aggregation can be biased when a broker drops in/out of the visible top-25 tail. citeturn4view0turn0search17  
- **Persistence and concentration are research-backed as important dimensions of flow**, because order flow is empirically persistent (often explained by order-splitting behavior). That supports your doctrine that persistence matters more than one-off spikes. citeturn5search2turn5search3  
- A credible “smart money” composite (**SMT-like**) is not standardized across the industry, but a **component-based score** (net flow, persistence, concentration, absorption, execution quality) is consistent with practitioner systems. The **weights** are inherently product doctrine; implement deterministically only if you label it explicitly as a composite heuristic (not a canonical indicator). citeturn3view0turn4view4  
- **Wash trading / manipulation detection cannot be done reliably** from daily top-25 broker summaries. Literature emphasizes that wash-trade investigation typically requires trade-level identity on both sides of each trade (or equivalent granular surveillance data). For v1, implement only **anomaly proxies** (overlap/two-way intensity, extreme turnover with low net, low-visibility days), and label them as risk flags, not conclusions. citeturn7search0turn7search20turn7search14  
- **Trust/regime adjustment by liquidity and market cap is strongly defensible**: lower liquidity environments are more susceptible to manipulation and have higher price impact, so flow evidence should be down-weighted for low-liquidity/smaller-cap names. Your fixed buckets are consistent with common Indonesian investor education materials that use market-cap tiers (e.g., big cap above Rp 10T). citeturn7search29turn13view0turn6search29  
- **Windowing**: 30 trading days is a good default for “current regime” responsiveness, but 60 is materially better for stability in correlation / regression-based trust metrics. A split-window approach (30 primary + 60 “stability check”) is the most defensible compromise.

## Concept Table

**Legend (Source quality):**  

- *Official docs* = exchange/broker/platform manuals/help centers  
- *Academic* = peer-reviewed papers / regulator-grade research  
- *Practitioner* = credible formula writeups; not official  
- *Community* = forums/social; use only when necessary

| Concept | Concise definition | Standard / semi-standard / product-specific | Required raw inputs | Recommended computation | Acceptable approximation with current data | Recommended window | Source quality | Confidence | Decision |
|---|---|---|---|---|---|---|---|---|---|
| CADI | Cumulative line of dominant-broker net buy/sell pressure | Product-specific name; semi-standard idea (cumulative net flow) | Daily top-25 buy+sell (value/lot), daily total value | Daily: compute broker net (buy−sell), pick top-N by \|net\|, sum net; cum-sum over time; compute slope | Treat missing (not-in-top25) as 0 (lower bound); add “visibility/coverage” qualifier | 30 primary; 60 context | Practitioner + academic support for imbalance → returns citeturn4view0turn5search3 | Med | Use now (with cautions & coverage) |
| Broker-side VWAP execution quality | Are big buyers paying above/below VWAP (and sellers likewise) | Standard VWAP; product-specific interpretation layer | OHLCV value & volume; broker avg price/value/lot | VWAP_day = value/volume; buy_avg_px = Σbuy_value/Σbuy_volume; compare vs VWAP; same for sell | Use value-based VWAP if volume unit ambiguity; use z-scores vs own history for thresholds | Daily signal + 20–30 smoothing | Academic + practitioner citeturn0search13turn4view0 | Med-High | Use now (thresholds calibrated) |
| GVPR (top-k participation) | Share of total activity accounted for by top-k brokers per side | Semi-standard concept; product-specific naming | Broker buy/sell value or lots; OHLCV total value | Over window: rank brokers by buy_value (and sell_value); GVPR_buy = top5_buy / total_value; GVPR_sell analogous | If ranking unstable due to dropouts, compute per-day top5 share then average | 20–30 primary; 60 audit | Practitioner + algo concept analogy citeturn4view0turn0search17 | Med | Use now |
| B/S spread & trend | Gap between aggregated buy avg price and sell avg price (pressure proxy) | Product-specific (not true bid-ask spread) | Broker avg prices & volumes; OHLCV VWAP | Spread_pct = (buy_avg_px − sell_avg_px)/VWAP; slope over window | Compute in VWAP-deviation space: (buy−VWAP) − (sell−VWAP) | 20–30 | Practitioner citeturn4view0 | Med | Use with caution |
| Top buyer share | Top1 broker buy share of total market value | Standard concentration ratio (CR1) | Daily buy list + OHLCV total value | top_buyer_share = top1_buy_value / total_value | None needed; robust under top-25 | Daily + 20–30 | Official/platform usage citeturn9view2turn8search0 | High | Use now |
| Top seller share | Top1 broker sell share of total market value | Standard concentration ratio (CR1) | Daily sell list + OHLCV total value | top_seller_share = top1_sell_value / total_value | None needed; robust under top-25 | Daily + 20–30 | Official/platform usage citeturn9view2turn8search0 | High | Use now |
| Sponsor-quality from gross summary | Strength/constructiveness of “dominant hands” participation | Product-specific interpretation | Broker summary + OHLCV (VWAP, total value), frequency | Rule-based rubric: concentration + persistence + execution + frequency profile + overlap risk | If frequency is noisy, rely more on value-based metrics | 30 primary | Platform + academic behavioral support citeturn9view2turn12search7 | Med | Use now (as rubric, not signal) |
| SMT-like composite | Composite “smart money” score (0–100) from multiple flow features | Product-specific | Broker summary + OHLCV price/value | Deterministic weighted composite (explicitly documented weights and transforms) | Use component panel first; compute composite only once calibration is stable | 30 + 60 stability | Practitioner + academic components citeturn3view0turn5search2turn5search3 | Med-Low | Use with caution |
| Broker persistence | Same brokers repeat same-side pressure across days | Semi-standard (order-flow persistence) | Broker identities + daily net per broker | Persistence = weighted recurrence of top brokers with consistent net sign; penalize two-way overlap | If net is biased, use “presence persistence” (broker stays in top buyers) | 30 | Academic citeturn5search2turn5search3 | Med-High | Use now |
| Concentration asymmetry | Buy concentration vs sell concentration imbalance | Product-specific built from standard measures | GVPR/top shares/Gini/HHI per side | Asym = conc_buy − conc_sell; classify buy-heavy/sell-heavy/balanced | Use top-k share difference if Gini unstable | 20–30 | Practitioner + standard concentration logic citeturn4view0turn5search0 | Med | Use now |
| Buy-side Gini | Inequality of buy participation shares | Standard measure; application-specific | Broker buy shares over window | Compute Gini on broker buy shares + “others” bucket | Prefer HHI/top-k if Gini too sensitive to truncation | 30 | OECD/inequality refs citeturn5search5turn5search9 | Med | Use with caution |
| Sell-side Gini | Inequality of sell participation shares | Standard measure; application-specific | Broker sell shares over window | Same as buy-side | Same | 30 | OECD/inequality refs citeturn5search5turn5search9 | Med | Use with caution |
| Flow-price correlation | How much flow features relate to future returns | Standard statistical concept; product-specific feature set | Flow features + close prices | Rolling Spearman/Pearson vs forward returns; optional rolling regression R² | Use Spearman + simple univariate first; don’t overfit | 60 primary | Practitioner + academic imbalance-return link citeturn3view0turn5search3 | Med | Use now (as trust, not direction) |
| Flow/price divergence | Price rises but flow weakens (or vice versa) | Semi-standard (divergence idea) | Price (returns/slope) + CADI/flow slope | Divergence if signs oppose for ≥k days and magnitude exceeds thresholds | Use slope sign + z-score thresholds; no pattern IDs | 20–30 | Practitioner citeturn3view0turn4view0 | Med | Use with caution |
| Wash/anomaly risk proxies | Flags for “flow may be synthetic/noisy” | Product-specific proxies (true wash detection needs granular data) | Broker overlap, net vs gross, turnover, coverage | Compute overlap ratio, two-way intensity, extreme turnover + low net, low coverage | Label as “risk elevated”; never conclude “wash trade” | 30 | Academic + regulator defs citeturn7search0turn7search20 | Med | Use now (risk-only) |
| Liquidity → trust | Down-weight flow in low-liquidity names | Standard microstructure intuition | Avg daily traded value (from OHLCV value) | Deterministic trust multiplier by bucket | None | 60 for bucket stability; 30 for regime | Academic manipulation/liquidity link citeturn7search29 | High | Use now |
| Market cap → trust | Down-weight flow in smaller caps | Standard; buckets product-fixed | soxclose market-cap proxy | Deterministic trust multiplier by bucket | None | 60 | Indonesian broker education + academic | Med-High citeturn13view0turn7search29 | Use now |
| Trustworthiness conditions | When flow is lead-capable vs unreliable | Product-specific regime logic | Liquidity+cap buckets, correlation, anomaly risk, coverage | Rule-based regime classifier combining those inputs | If correlation unreliable, default to liquidity+cap+coverage | 30 primary; 60 stability | Academic + practitioner | Med citeturn3view0turn7search29 | Use now (transparent rules) |
| Window choice 30 vs 60 | Select primary lookback windows | Standard time-series tradeoff | Any metric series | 30 for responsiveness; 60 for stability in correlation/regression | Use dual-window dashboard | N/A | Official guidance to look beyond 1 day + stats reasoning citeturn8search2 | Med | Use now |
| Deterministic v1 set selection | Criteria for “robust enough now” | Product-specific design decision | All above | Include metrics with low sensitivity to truncation and clear semantics | N/A | N/A | Inferred from constraints | Med | Use now |
| Heuristic-only set selection | Criteria for “compute but treat cautiously” | Product-specific design decision | All above | Use where formula is clear but thresholds/meaning depend on regime | N/A | N/A | Inferred from constraints | Med | Use now |
| Deferred set selection | Criteria for “needs better data” | Product-specific design decision | Tick/LOB/full broker ledger (not available) | Defer anything requiring trade-level matching or order-book inference | N/A | N/A | Strongly sourced limitation citeturn7search0 | High | Use now |

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Indonesia stock broker summary table top buyer top seller","Stockbit broker flow chart screenshot","IDX broker summary example buy sell brokers"],"num_per_query":1}

## Formula Notes

Below, “value” is IDR traded value; “volume” is share volume where available; “lot_volume” means lots (1 lot typically = 100 shares in Indonesia—if your OHLCV volume is already in lots, skip conversion). The system should prefer **value-based** normalization when unit ambiguity exists.

A recurring adaptation principle for top-25-per-side truncation:

- Define **daily coverage** per side:  
  - coverage_buy_day = Σ(top25_buy_value) / total_value_day  
  - coverage_sell_day = Σ(top25_sell_value) / total_value_day  
  These are computable with your inputs and should be carried as *context* for interpreting any distribution/concentration metric. (This is an inference derived from your data contract; it is not a named market standard.)
- When you need a “full distribution” across brokers for concentration metrics, use **broker shares vs total market value** and add a synthetic **OTHERS** bucket:  
  others_share = 1 − Σ(visible broker shares).  
  This keeps shares summing to 1 and reduces the bias of ignoring the tail, but it still collapses the tail into one bucket (acceptable v1 approximation).

### CADI

**Meaning in practice (family of formulas).** The clearest documented usage found in Indonesian broker-flow tooling defines CADI as “Cumulative Accumulation Distribution Index,” built from the **top 10 brokers by absolute net activity each day**, then **accumulated through time**. citeturn4view0  
This is **not a globally standardized indicator name**; it is best understood as a branded implementation of a **cumulative net-order-flow/imbalance** concept (order imbalance is widely studied and linked to returns). citeturn5search3  

**Defensible deterministic v1 formula (aligned to that practice).**

For each day *t*:

1) Build daily broker maps from the two top-25 lists:  

- buy_value[b], buy_lots[b], buy_freq[b]  
- sell_value[b], sell_lots[b], sell_freq[b]

1) Compute *visible* net per broker (value-based):  

- net_value[b,t] = buy_value[b,t] − sell_value[b,t] (missing side treated as 0)

1) Select dominant brokers by absolute net (daily):  

- D(t) = top N brokers by |net_value[b,t]| with N = 10 (per the documented practice) citeturn4view0  

1) Compute the daily CADI increment. Two defensible variants:

- **Raw CADI increment (scale depends on liquidity):**  
  ΔCADI_raw(t) = Σ_{b∈D(t)} net_value[b,t]
- **Normalized CADI increment (cross-ticker comparability):**  
  ΔCADI_norm(t) = (Σ_{b∈D(t)} net_value[b,t]) / total_value_day(t)

1) Accumulate:  

- CADI(t) = CADI(t−1) + ΔCADI_(raw or norm)(t)

**Is CADI based on top-N net brokers, all visible brokers, or something else?**  
The documented broker-flow implementation explicitly uses **top 10 by absolute net activity each day** (not “all brokers”). citeturn4view0  
Given your truncation, “all brokers” is impossible, so “top-N among visible” is the only deterministic choice (and is consistent with that practice).

**Trend/slope computation.** Two robust deterministic approaches:

- **Linear regression slope** of the CADI series over the chosen window (captures “tide” behavior; less noise than end-start).  
- **Window delta**: CADI(end) − CADI(start), optionally divided by window length for a per-day rate.

The practitioner description emphasizes measuring “how much the trend has shifted over the analysis period,” which is consistent with either regression slope or delta. citeturn3view0  

**Most defensible window.**  

- **30 trading days** is defensible for “current sponsor lean” responsiveness.  
- **60 trading days** is better as a stability check, particularly for names where activity is episodic.

**How to adapt to top-25-per-side truncation.**  

- Treat missing broker activity as 0 ⇒ CADI is a **lower bound** on true net for that broker.  
- Carry **coverage**; when coverage is low, interpret CADI slope as lower-confidence (inference).  
- Consider also computing CADI from **top-N by gross buy+sell participation** as a robustness check, but keep CADI’s primary definition net-based to match the found practice. citeturn4view0  

### Broker-side VWAP execution quality

**What VWAP is (standard).** VWAP is commonly defined as **total traded value divided by total traded volume** and is widely used as an execution benchmark (measure of execution quality/price impact). citeturn0search13  

**Interpretation: buy_avg_vs_vwap and sell_avg_vs_vwap.** The broker-flow practice found frames the comparison as:

- buyers paying **above** VWAP ⇒ “chasing / urgency”  
- buyers paying **below** VWAP ⇒ “patient accumulation / getting deals”  
- sellers accepting **below** VWAP ⇒ “dumping / urgency”  
- sellers achieving **above** VWAP ⇒ “patient selling / control” citeturn4view0  

This is a *behavioral aggressiveness heuristic*, not proof of informed trading.

**Which denominator is most defensible?**  
Given your inputs, the most defensible is **daily session VWAP**:

- VWAP_day(t) = total_value_day(t) / total_volume_day(t) citeturn0search13  
- If “volume” unit is uncertain, use the broker summary value/lot arithmetic to produce a consistent per-share price, or compute deviations in price terms relative to close/VWAP using value-based weights only (implementation choice, inferred).

A “selected-window VWAP” is also legitimate as Σvalue/Σvolume across the window, but it changes the question from “today’s execution vs today’s fair price” to “today vs period fair price.” For v1, use daily VWAP and then optionally smooth the deviation series.

**Deterministic computations (value-based, top-25 aware).**

For each day t:

- buy_avg_px_top25(t) = Σ(top25_buy_value) / Σ(top25_buy_volume)  
- sell_avg_px_top25(t) = Σ(top25_sell_value) / Σ(top25_sell_volume)  
- buy_dev(t) = (buy_avg_px_top25(t) / VWAP_day(t)) − 1  
- sell_dev(t) = (sell_avg_px_top25(t) / VWAP_day(t)) − 1

**Thresholds for aggressive vs passive execution.**  
No canonical thresholds were found in official sources; thresholds are *platform/product heuristics*. The safest deterministic approach is to avoid fixed bps numbers and use **within-ticker z-scores**:

- z_buy_dev(t) = (buy_dev(t) − mean(buy_dev, window)) / std(buy_dev, window)

Then classify:

- “aggressive” if z_buy_dev ≥ +1 (buyers unusually above VWAP vs their own history)  
- “patient” if z_buy_dev ≤ −1  
(and analogous for sellers)

This makes “aggressive vs passive” **regime-relative**, which is important across different liquidity/volatility regimes (inferred).

**Adaptation to top-25 truncation.**  
Because buy/sell averages are computed from only top-25, they describe the *execution of dominant visible brokers*, not the whole market. That’s acceptable because this metric is explicitly intended to characterize “big hands” behavior; still, use coverage to avoid overconfidence on low-coverage days (inferred). citeturn4view0  

### GVPR / gross volume participation ratio

**Meaning in practice.** The broker-flow system examined defines GVPR as: aggregate broker lots over the selected period, rank brokers, and ask what share belongs to the top 5; it explicitly uses thresholds like “above 60% = a few big players dominate; below 40% = retail-driven.” citeturn4view0  

**Relationship to standard “participation rate.”** In execution algorithms, “participation rate” typically means executing some quantity as a percent of the market’s executed volume. citeturn0search17  
GVPR here is closer to a **concentration ratio (CR5)** than “my order participation,” but the underlying idea—share of total activity—is consistent.

**Deterministic v1 formulas with your data.**

Over a window W:

1) Compute total market value in the window:  

- V_total(W) = Σ_{t∈W} total_value_day(t)

1) Compute broker buy and sell totals over the window from observed daily top-25 lists:  

- B_b(W) = Σ buy_value[b,t]  
- S_b(W) = Σ sell_value[b,t]

1) Rank and compute participation shares:

- GVPR_buy(W) = (Σ_{b in top5 by B_b(W)} B_b(W)) / V_total(W)  
- GVPR_sell(W) = (Σ_{b in top5 by S_b(W)} S_b(W)) / V_total(W)

**What denominator is correct or least bad under top-25 visibility?**  

- Using **V_total(W)** (from OHLCV) is the least bad because it anchors to *all market activity*, preventing overstatement that would happen if you divide by only the visible top-25 sums. (This is an inference based on data completeness; the “top-5 share” concept itself is from practitioner practice.) citeturn4view0  

**Bias under partial visibility (explicitly).**

- Brokers that do meaningful volume but frequently rank outside daily top-25 will have their B_b(W)/S_b(W) underestimated (missing days treated as 0). This can mis-rank “true” top-5 over the window.  
- A practical v1 mitigation is a **per-day GVPR**: compute each day’s top5 share (which is fully observable within that day’s top-25) then average over the window. This answers a slightly different question (“typical daily dominance”) but is more stable under truncation (inferred).

### B/S spread and spread trend

**Meaning.** The examined practice describes “B/S Spread” as a “negotiation gap” between buyer and seller execution—a pressure check that widens when one side pushes harder. citeturn4view0  
Important: this is *not* the exchange bid-ask spread; it’s an aggregate of dominant brokers’ average execution prices.

**Formula.** Daily:

- bs_spread_px(t) = buy_avg_px_top25(t) − sell_avg_px_top25(t)  
- bs_spread_pct(t) = bs_spread_px(t) / VWAP_day(t)

Trend over window: slope or delta of bs_spread_pct.

**Adaptation.** Because buy and sell are computed on different truncated sets (top-25 each side), the spread can be distorted by missing tail. Use as *secondary evidence* and require coverage not extremely low (inferred).

### Top buyer share and top seller share

**Meaning.** Simple dominance metrics: “who is the biggest buyer/seller today (or over window).” Platforms commonly present “Top Buyer / Top Seller” lists in broker summary tooling. citeturn9view2turn8search0  

**Formulas.**

- top_buyer_share_day(t) = max_broker_buy_value(t) / total_value_day(t)  
- top_seller_share_day(t) = max_broker_sell_value(t) / total_value_day(t)

Over window: replace numerator by max over Σ value per broker; denominator by Σ total_value.

**Adaptation.** Very robust under top-25 truncation because top-1 is always observed by design (assuming your snapshot is correct).

### Sponsor-quality interpretation from gross broker summary

**What “sponsor quality” is in practice.** Indonesian broker summary education emphasizes using broker activity (often net buy/sell and top broker sets) to infer accumulation/distribution by “bandar/market maker,” and it recommends checking behavior across multiple brokers and multiple days—not just one day—because netting and short-term activity can mislead. citeturn9view2turn8search2  
Separately, formal research on Indonesian equities distinguishes individual vs institutional behavior: individuals tend to trade more frequently with smaller amounts and shorter holding periods, while institutions tend to trade less frequently with larger amounts and longer holding periods—supporting your plan to use **frequency profile** as one sponsor-quality dimension. citeturn12search7  

**Deterministic rubric (flow-only, no chart triggers).** Build a categorical label from:

- **Direction evidence (gross-first):** CADI slope/level, buy vs sell dominance. citeturn4view0  
- **Concentration evidence:** top buyer/seller share, GVPR buy/sell, concentration asymmetry. citeturn4view0  
- **Persistence evidence:** repeated presence of same brokers on same side; order-flow persistence is a documented empirical property tied to order splitting. citeturn5search2  
- **Execution evidence:** buy_dev/sell_dev vs VWAP (aggressive vs patient). citeturn0search13turn4view0  
- **Institutional “fingerprint” evidence:** low frequency with high value among dominant brokers is consistent with institutional patterns (supporting evidence from Indonesian investor-behavior research). citeturn12search7  
- **Risk discounts:** high overlap/two-way intensity; low coverage; low liquidity regime.

**A practical 4-tier sponsor label (implementation-oriented).**

- **Strong sponsor:** buy-side concentration high *and* persistent; sell side fragmented; CADI rising; anomaly risk controlled.  
- **Constructive sponsor:** some concentration + improving persistence; not contradicted by execution quality; moderate risk.  
- **Mixed/noisy:** concentration and direction disagree; high overlap; low coverage; no persistence.  
- **Weak sponsor:** sell-side concentrated/persistent; CADI falling; execution suggests urgency on sell side.

This scheme is inferred from the combination of platform/practitioner definitions and the empirical research on persistence and participant behavior, not a single official standard. citeturn4view0turn12search7turn5search2  

### Smart-money composite score (SMT-like)

**Is there a credible standardized way?**  
No globally standardized “SMT” exists in official exchange material; what exists are many product-specific composites. The examined Indonesian broker-flow system uses a composite “Smart Money Tracker” score built from five components with explicit weights (net flow, persistence, net concentration, absorption, execution quality). citeturn3view0turn4view4  

**Most defensible components (research-backed vs heuristic).**

- **Research-backed building blocks:**  
  - order imbalance/net flow as a flow signal correlated with returns in many studies citeturn5search3  
  - persistence of order flow (often attributed to order splitting) citeturn5search2  
  - concentration as “few big participants dominate” (conceptual; concentration metrics are standard, but interpretation is application-specific) citeturn5search0  
- **More heuristic in your data setting:**  
  - “absorption” without intraday tape (you can proxy with large value + small price movement from OHLC, but it is coarse)  
  - exact **weights** among components

**Deterministic v1 algorithm outline (transparent composite).**

1) **Netting step (secondary, after gross):** for each broker/day, compute net_value and overlap_value = min(buy_value, sell_value). This aligns with the caution that net can hide two-way activity and should not replace gross. citeturn4view4turn9view2  
2) Compute 5 component scores in [0,1] (each via rank/percentile or z-score transform within the ticker).  
3) Weighted sum to 0–100.

If you adopt the 30/25/20/15/10 weights seen in the examined system, treat them as **product doctrine**, not research-derived constants. citeturn3view0turn4view4  

### Persistence

**How should persistence be measured?** The literature supports that order flow exhibits long memory; one explanation is that large “parent” orders are split over time, creating persistent buy/sell signs. citeturn5search2  
That supports measuring persistence as more than “consecutive green days.”

**Three deterministic persistence metrics that fit your data contract.**

1) **Consecutive same-side streaks (dominant-broker set):**  

- Define TopSetBuy(t) = top K buyers by value (daily), K=5 or 10.  
- Persistence_streak_buy = max run length where TopSetBuy(t) overlaps ≥ m brokers with prior day.  
Pros: gross-first, robust. Cons: ignores direction per broker.

1) **Weighted persistence by traded value (broker-level net sign):**  

- For each broker b, define sign_b(t)=sign(net_value[b,t]).  
- Persistence_value = Σ_b (Σ_t w_t *sign_b(t)* |net_value[b,t]|) / Σ_b (Σ_t w_t * |net_value[b,t]|)  
where w_t is recency weight.  
Pros: direction-aware; aligns with “persistence matters.” Cons: net bias from truncation.

1) **Recurrence concentration (how concentrated leadership is through time):**  

- Compute broker “leadership share” = broker’s count of days appearing in TopSetBuy minus TopSetSell (or separately).  
- Concentration of these counts (HHI/Gini) indicates whether the same names keep showing up.

**How should persistence degrade when the same broker appears on both sides?**  
Use overlap_value = min(buy_value, sell_value) as “two-way” activity; then:

- net_value = buy − sell  
- net_strength = |net| / (buy + sell) (if denominator > 0)  
Penalize persistence contributions when net_strength is low (broker is active but not directional). This is consistent with platform/practitioner warnings that netting can hide heavy two-way flow and that gross should be inspected first. citeturn4view4turn9view2  

### Concentration

**Is Gini the right metric? Alternatives.**  

- **Gini** is a standard inequality measure (often defined via Lorenz-curve area; widely used by OECD). citeturn5search5turn5search9  
- **HHI** is a standard concentration measure (sum of squared shares) and is easy to compute and interpret (higher = more concentrated). citeturn5search0  
- **Top-k share (CRk)** is the most robust metric under truncation (because you reliably observe the top).  
- **Entropy** is useful but tends to be more sensitive to the tail—hard under top-25 truncation.

**Most defensible in your specific data constraints.**

- For deterministic v1, prioritize **Top-k share** and **HHI (with an OTHERS bucket)** over pure Gini, because HHI works well even when the tail is lumped and is widely defined with a clear formula. citeturn5search0  
- Keep Gini as secondary “shape” evidence if you implement OTHERS-bucket correction; label it “approximate under truncation.”

**Credible thresholds for buy-heavy/sell-heavy/balanced.**

- There is no universal market standard for “buy-heavy” in broker-flow contexts.  
- A pragmatic approach is:
  - buy-heavy if (GVPR_buy − GVPR_sell) ≥ threshold AND/OR (HHI_buy − HHI_sell) ≥ threshold  
  - sell-heavy if opposite  
  - balanced otherwise  
Use thresholds defined as percentiles of historical asymmetry for that ticker+liquidity bucket (calibrated heuristic).  
The practitioner system’s GVPR interpretation uses absolute thresholds like 60% and 40% for “institutional vs retail territory.” These can be used as initial anchors but should be validated per liquidity regime. citeturn4view0  

### Flow-price correlation

**Which price series is most appropriate?**  
For “trust/regime,” the goal is not to predict exact next-day returns but to know whether flow tends to matter for this ticker.

Most defensible options:

- **Forward returns:** r_{t→t+h} = ln(C_{t+h}/C_t). Using forward returns matches the idea of flow “leading” price.  
- Use h = 1 day for short-term; h = 5 days for swing horizon. (This is standard time-series practice; inference.)

**Which flow series?**  
Start simple and then expand:

- net_flow_norm(t) = (Σ visible buy_value − Σ visible sell_value) / total_value_day  
- CADI_slope over window (directional persistence) citeturn4view0  
- optional SMT score (if kept) citeturn3view0  

**Which method: Pearson, Spearman, rolling R², rank IC?**

- **Spearman** is often more robust to outliers/regime shifts for these kinds of noisy behavioral series (inference).  
- Rolling **R²** from a simple regression aligns with the practitioner dashboard approach (“how much broker flow explains future movement”). citeturn3view0  

**Deterministic v1 recommendation.**

- Compute:  
  - Spearman corr(flow_feature_t, forward_return_{t+1}) over 60 days  
  - and/or simple OLS R² with 1–3 flow features over 60 days  
- Convert to a trust badge: strong / moderate / weak / minimal.

**Why 60 days here?**  
Correlation/regression estimates are unstable with small samples; doubling sample size from 30 to 60 materially reduces estimation noise (statistical inference).

### Divergence

**Definition (bullish vs bearish) consistent with practice.**
The analyzed broker-flow system defines divergence conceptually as:

- **Bullish divergence:** price weak/down while brokers/flow metrics improve (buying)  
- **Bearish divergence:** price strong/up while brokers/flow metrics weaken (selling)  
and explicitly warns divergence is a *setup context / warning*, not a trigger. citeturn3view0turn4view0  

**Deterministic divergence detection (flow-only, chart-light).**
Over a lookback L (e.g., 20 days):

- price_slope = slope(ln(close))  
- flow_slope = slope(CADI) or slope(net_flow_norm)  
Bullish divergence if price_slope < 0 AND flow_slope > 0 AND both slopes have |z| ≥ 1.  
Bearish divergence if price_slope > 0 AND flow_slope < 0 AND both |z| ≥ 1.

**How many sessions before divergence is meaningful?**

- Avoid <10 sessions; too noisy.  
- 15–30 sessions is a reasonable minimum in daily data for slope-based divergence; use 20 as default (inference consistent with typical daily-horizon divergence logic).  
This remains a heuristic due to lack of canonical standards in broker-flow contexts.

### Wash risk / anomaly risk proxies

**What can be inferred from daily top-25 broker summaries?**
You can infer **patterns consistent with noisy or potentially synthetic flow**, such as:

- high two-way overlap of the same brokers on both sides  
- high gross activity with low directional net  
- extreme concentration in micro/very-low liquidity names  
These are *risk flags*, not confirmations.

**What cannot be inferred without tick-level or order-book data?**
Empirical wash-trade investigation generally requires trade-level matching and identities of buyer and seller per trade. citeturn7search0turn7search20  
With only daily top-25 summaries, you cannot identify self-matching at the trade level or confirm “no change in beneficial ownership,” which is core to wash trade definitions in surveillance contexts. citeturn7search20turn7search14  

**Realistic v1 anomaly proxies (deterministic).**

1) **Overlap ratio (two-way intensity):**  

- overlap_value_day = Σ_b min(buy_value[b], sell_value[b])  
- overlap_ratio = overlap_value_day / total_value_day  
High overlap_ratio ⇒ flow may be less directional (heuristic).

1) **Net-to-gross ratio:**  

- gross_visible = Σ buys + Σ sells (visible)  
- net_visible = |Σ buys − Σ sells| (visible)  
- net_gross = net_visible / gross_visible  
Very low net_gross on high volume days ⇒ “churn-like” activity.

1) **Coverage risk:**  
Low coverage_buy/coverage_sell days ⇒ your view is partial; raise “anomaly/uncertainty” flag (inference).

2) **Extreme turnover with tight range:**  
High total_value_day relative to its history combined with small (high−low)/close suggests absorption or synthetic churn; without intraday tape, treat as “anomaly risk elevated,” not “wash” (inference).

### Trust regime logic

**How liquidity should affect trust (strongly sourced).**
Lower-liquidity stocks are more susceptible to manipulation and have higher price impact; academic evidence on manipulation shows illiquid stocks are more likely to be manipulated and manipulation can increase volatility. citeturn7search29  

**How market cap should affect trust (moderately sourced).**
Investor-education materials in Indonesia commonly describe big-cap/blue-chip tiers (e.g., > Rp 10T) as more stable; smaller tiers as more volatile. citeturn13view0turn6search29  
This is directionally consistent with broader manipulation/liquidity findings (smaller/less liquid often riskier), though market cap alone is not sufficient. citeturn7search29  

**When broker-flow signals are more trustworthy vs less trustworthy.**
A deterministic classifier for your doctrine:

- **lead_capable** (flow can lead price):  
  - liquidity ∈ {high, medium}  
  - coverage not low (e.g., avg coverage ≥ 0.65)  
  - flow-price trust metric not weak (e.g., Spearman |ρ| above threshold or R² above threshold) citeturn3view0  
  - anomaly risk not elevated  
- **support_only** (flow confirms, less likely to lead):  
  - liquidity medium/low OR coverage moderate  
  - correlation moderate  
- **secondary**:  
  - liquidity low/very_low OR market cap micro/small  
  - correlation weak  
  - anomaly risk moderate  
- **unreliable**:  
  - very_low liquidity and/or micro cap  
  - coverage low  
  - anomaly risk elevated  
This is inferred from combining the strong sourcing on manipulation/liquidity risk with practitioner framing that some tickers are inherently lower-trust for flow tools. citeturn7search29turn3view0  

## Window Recommendation

**Recommended default primary window:** **30 trading days**.

- This aligns with the practical guidance (seen in exchange education content) to not judge broker activity from a single day and to examine multi-day patterns. citeturn8search2  
- It balances responsiveness (so the system can detect shifts in dominance/persistence) with enough observations to stabilize basic averages and slopes (inference).

**Recommended secondary comparison windows:** **20, 60 trading days**.

- **20 days**: faster detection of regime changes in CADI slope / concentration asymmetry (but noisier).  
- **60 days**: stabilizes correlation/regression-based trust metrics, and reduces false regime flips (inference; also consistent with the practitioner use of “flow-price correlation” as a trust layer that benefits from more data). citeturn3view0  

**Justification by metric type (implementation oriented).**

- Direction + sponsor-quality metrics (CADI slope, GVPR asymmetry, persistence): 30 primary, 20 secondary, 60 audit.  
- Trust metrics (flow-price correlation / R² badges): 60 primary, 30 secondary.  
- Risk metrics (overlap/coverage anomalies): 30 primary, but with daily flags.

## V1 Deterministic Set

A deterministic v1 broker-flow **context packet** (no entries/stops/targets; flow-to-price comparisons only for lead/confirm/warning) should compute:

- **Data quality & regime context**
  - liquidity bucket (from avg daily value; your fixed thresholds)
  - market cap bucket (from soxclose; your fixed thresholds)
  - daily coverage_buy, coverage_sell (top-25 visibility ratios; inferred but crucial under truncation)

- **Core gross-first flow descriptors**
  - top buyer share (day and 30d)
  - top seller share (day and 30d)
  - GVPR_buy and GVPR_sell (30d; plus per-day averaged variant)
  - concentration asymmetry (GVPR_buy − GVPR_sell)

- **Direction evidence (flow engine)**
  - CADI series (normalized variant recommended for comparability)
  - CADI slope (20d and 30d; 60d audit)

- **Execution-quality proxies**
  - VWAP_day and buy_dev/sell_dev (daily)
  - smoothed buy_dev/sell_dev z-scores (30d)

- **Persistence evidence**
  - dominant-broker recurrence (e.g., overlap of daily top-5 sets)
  - value-weighted persistence using daily net direction per broker (30d)

- **Risk/anomaly flags (risk-only)**
  - overlap_ratio (two-way intensity)
  - net_gross ratio
  - low-coverage flag
  - extreme turnover + tight range flag (risk only; inferred)

- **Trust layer**
  - flow-price correlation (Spearman or simple R²) using **60d** window as primary, computed against forward returns
  - trust regime label: lead_capable / support_only / secondary / unreliable (transparent rules)

This set is implementable with your raw inputs while respecting “gross first” and keeping outputs as weighted evidence rather than trade permission. citeturn4view4turn0search13turn5search2turn7search0  

## Deferred Set

These should be deferred until you have **tick-level trade data**, fuller broker coverage, and/or order-book data:

- **True wash-trade detection** (trade-level self-match / beneficial ownership inference). Strongly limited by data; literature emphasizes the need for trade-level identities of purchaser and seller. citeturn7search0turn7search20  
- **Order-book-based aggressiveness metrics** (true bid/ask capture, spread paid, queue position effects). Not feasible from daily summaries (inferred).  
- **“Absorption” with intraday structure** that distinguishes stealth accumulation vs churn reliably (you can proxy with daily range vs value, but it remains ambiguous without intraday path; inferred).  
- **Full-universe broker distribution measures** (true Gini/entropy across all brokers without truncation bias). You can approximate with OTHERS, but “true” versions require full broker ledger or complete top-N coverage beyond 25 (inferred).  
- **Any methodology that requires identifying buyer-initiated vs seller-initiated trades** at the transaction level (classic microstructure classification issues require more granular data). citeturn12search3  

## References

Each source below is listed with a **source type**, and major conclusions relying on it are labeled as **strongly sourced**, **weakly sourced**, or **inferred**.

- entity["organization","Indonesia Stock Exchange","stock exchange indonesia"] RDIS education pages defining broker summary as a recap of buy/sell activity by broker over a period. **Source type:** exchange education / official. **Conclusion strength:** strongly sourced. citeturn8search0turn8search1  
- entity["company","BCA Sekuritas","brokerage indonesia"] mobile manual defining broker summary similarly (ringkasan aktivitas transaksi saham berdasarkan broker/sekuritas). **Source type:** broker platform manual (official). **Conclusion strength:** strongly sourced. citeturn9view0  
- entity["company","Stockbit","indonesia investing app"] help-center articles describing broker flow (intraday by broker) and broker summary/bandar detector fields (top brokers, net/gross, buy/sell values and averages). **Source type:** broker/platform docs (official). **Conclusion strength:** strongly sourced. citeturn9view1turn9view2turn8search13  
- Practitioner “IDX Flow” guide documenting CADI (top-10 by absolute net daily), GVPR (top-5 share), VWAP interpretation, SMT component structure, and trust framing. **Source type:** practitioner article (explicit formulas/definitions, not official). **Conclusion strength:** weakly sourced for “name/thresholds,” useful as implementation reference. citeturn3view0turn4view0turn4view4  
- McCulloch & Kazakov paper defining VWAP and its use as execution quality measurement. **Source type:** academic paper. **Conclusion strength:** strongly sourced (VWAP definition/benchmark usage). citeturn0search13  
- Infront “Algorithm Trading Guide” defining participation rate as a cap relative to global executed volume. **Source type:** broker/platform technical doc. **Conclusion strength:** strongly sourced for “participation rate” concept; **inferred** mapping to GVPR top-k share. citeturn0search17  
- entity["organization","United States Department of Justice","antitrust division"] page defining HHI calculation (sum of squared shares). **Source type:** official regulator guidance. **Conclusion strength:** strongly sourced for HHI formula; **inferred** application to broker shares. citeturn5search0  
- entity["organization","OECD","economic research organization"] and Our World in Data explanations of Gini coefficient (standard inequality measure). **Source type:** official/credible explainer. **Conclusion strength:** strongly sourced for Gini meaning; **inferred** application to broker shares under truncation. citeturn5search5turn5search9  
- Lillo, Mike & Farmer theory paper on long-memory in buy/sell order signs (order splitting explanation). **Source type:** academic preprint (widely cited). **Conclusion strength:** strongly sourced for persistence rationale. citeturn5search2  
- Chordia et al. paper on order imbalance and individual stock returns (daily horizon). **Source type:** academic paper. **Conclusion strength:** strongly sourced for “imbalance relates to returns” rationale; **inferred** mapping from broker-summary imbalance to order imbalance. citeturn5search3  
- entity["organization","Financial Services Authority","indonesia financial regulator"] (OJK) working paper on institutional vs individual behavior in Indonesian equities (frequency/size/holding period differences). **Source type:** regulator research (official). **Conclusion strength:** strongly sourced for frequency-profile rationale. citeturn12search7  
- Imisiker et al. paper stating wash-trade investigation requires trade-level identity data. **Source type:** academic paper. **Conclusion strength:** strongly sourced limitation. citeturn7search0  
- entity["organization","Financial Industry Regulatory Authority","us self-regulatory org"] + SEC rule filing defining wash sales/self-trades as no-change-in-beneficial-ownership manipulative trades and discussing prevention. **Source type:** regulator/market rule docs (official). **Conclusion strength:** strongly sourced for definition and data needs; supports deferring true wash detection. citeturn7search20  
- Aggarwal & Wu “Stock Market Manipulation—Theory and Evidence” finding illiquid stocks are more likely to be manipulated; manipulation increases volatility. **Source type:** academic paper. **Conclusion strength:** strongly sourced for liquidity-to-trust down-weighting. citeturn7search29  
- entity["company","Mandiri Sekuritas","MOST platform indonesia"] educational page showing Indonesian-style big-cap tiers (big cap above Rp 10T, etc.). **Source type:** broker education (official). **Conclusion strength:** moderately sourced for market-cap tiering; your exact buckets remain product-fixed. citeturn13view0
