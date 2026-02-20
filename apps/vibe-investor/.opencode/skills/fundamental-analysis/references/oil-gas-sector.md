---
name: oil-gas-sector
description: Oil & gas sector (Indonesia/IDX) reference — value chain (hulu→hilir), PSC basics (cost recovery vs gross split), key benchmarks (ICP/MOPS/Brent), and IDX proxy mapping by sub-segment.
---

# Oil & Gas Sector Framework

The O&G industry spans exploration through refining. In Indonesia, upstream activities are governed via **PSC (Production Sharing Contract)** structures under state control. Exact terms vary by block and regime; treat “government take is high” as the only stable generalization.

## Industry Segments

- **Upstream (Hulu)**: Exploration and production (E&P)
- **Midstream**: Transportation (pipelines, tankers), storage (FPSO)
- **Downstream (Hilir)**: Refining crude into gasoline, diesel, petrochemicals

## Indonesia-specific actors (reference)

| Role | Common entity |
|---|---|
| Regulator/policy (energy) | **ESDM** |
| Upstream operator governance | **SKK Migas** |
| Downstream distribution/regulation | **BPH Migas** |
| National champion (integrated) | **Pertamina** (not listed) |

## PSC basics (practical)

| PSC regime | Practical intuition | What to watch in disclosures |
|---|---|---|
| **Cost recovery** | Operator spends capex/opex, then recovers eligible costs before profit split | Cost recovery eligibility, cost efficiency, timeline of payout |
| **Gross split** | Split is more “formula-based”; operator economics depend on split variables | Split sensitivity, operating leverage to lifting and price |

## Asset Lifecycle

| Phase | Key Activities | Risk |
|-------|---------------|------|
| **Exploration** | Seismic 2D/3D, wildcat drilling (30-40% success rate) | Dry well → impairment write-off hits net profit |
| **Appraisal** | Delineation wells to define reservoir size/boundaries | Reserves may be smaller than expected |
| **Development** | FEED, EPC (rigs, pipelines, facilities), injection wells | High capex, execution delays |
| **Production** | Primary recovery (5-15%), artificial lift (ESP/gas lift), EOR (+20-30%) | Decline rate requires constant reinvestment |
| **Abandonment** | Plug & Abandon (P&A), well cement sealing, infrastructure dismantling | Environmental liability |

## Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **BPOED** | Barrel Oil Equivalent per Day — combines oil + gas production | Higher = larger producer |
| **Decline Rate** | Annual % drop in natural production from a well | High rate = constant capex needed |
| **RRR** | Reserve Replacement Ratio — new reserves vs produced | >100% to sustain production |
| **Recovery Factor** | % of oil in ground actually extractable | Varies by technique |
| **OOIP/OGIP** | Original Oil/Gas In Place — total volume before production | Baseline for recovery estimates |
| **OPEX per BOE** | Operating expense per barrel equivalent | Lower = higher efficiency |

## Indonesia price/benchmark references (common in local narratives)

| Benchmark | Where it shows up | Practical use |
|---|---|---|
| **Brent / WTI** | Global price tape | Directional crude sentiment |
| **ICP (Indonesia Crude Price)** | Indonesian upstream pricing reference | Local framing of crude price environment |
| **MOPS** (fuel product pricing reference) | Downstream/fuel pricing discussions | Proxy for downstream margins (paired with subsidy policy) |
| **JKM** | LNG Asia | LNG narrative proxy |

## Crude Oil Quality

- **API Gravity**: High (>40°) = "Light" (easier to refine, premium); Low (<25°) = "Heavy" (viscous, discount)
- **Sulfur**: "Sweet" = low sulfur (premium price); "Sour" = high sulfur (higher refining cost)

## Global Benchmarks

| Benchmark | Market | Commodity |
|-----------|--------|-----------|
| **Brent** | Europe/Africa/Middle East | Crude oil |
| **WTI** | US | Crude oil |
| **Henry Hub** | US | Natural gas |
| **TTF** | Europe | Natural gas |
| **JKM** | Asia (relevant for Indonesia) | LNG |

## Cost Structure

- Offshore drilling significantly more expensive: rig rental $300k-$600k/day, complex logistics, weather risk
- Offshore fields often contain much larger reserves than onshore
- 1 barrel ≈ 159 liters

## IDX proxy mapping (who benefits where)

This mapping is a **practical proxy list** used in Indonesia discussions to decide “which lane” you are buying. Always re-validate with current business mix.

| Sub-segment | What it does | Typical IDX proxies (examples) |
|---|---|---|
| Upstream E&P | Lifting exposure | MEDC, ENRG, RATU |
| Seismic/services (upstream gateway) | Field work before drilling/production | ELSA |
| Rig/drilling & construction | Build/operate rigs and drilling execution | APEX, RUIS |
| Offshore support vessels (OSV) | Crew/material logistics to offshore rigs | LEAD, WINS, ELPI, SOCI |
| FPSO/FSO storage | Floating storage/production interface | SHIP (limited) |

## O&G narrative proxies (weekly–monthly)

If you are treating O&G as a narrative/rotation play, proxy selection depends on what the market is pricing:

| Narrative | What usually moves first | What to verify |
|---|---|---|
| “Oil price up” | Upstream E&P proxies | Lifting trend + cost + leverage/FX risk |
| “Capex cycle is back” | Services/drilling/OSV | Tender pipeline + utilization (operational updates) |
| “Downstream tightness” | Integrated/distribution beneficiaries | Policy/subsidy risk + product pricing reference |

For a narrative-focused proxy map, use `get-knowledge oil-gas-narrative-proxies`.
