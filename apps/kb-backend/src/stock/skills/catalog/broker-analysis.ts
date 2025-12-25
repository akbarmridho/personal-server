import type { Skill } from "../types.js";

export const brokerAnalysis: Skill = {
  name: "broker-analysis",
  description:
    "Contains Indonesian IDX broker codes, tags notable “bandar” brokers, and summarizes crowd-observed broker-conglomerate link patterns for bandarmology analysis. Designed for quick lookup and collaborative validation, with clear confidence levels and caveats to separate strong signals from rumors.",
  content: `# Broker Analysis

## 1. Notable Bandars & Market Makers (The "Whales")

These brokers are identified as primary market movers, conglomerate vehicles, or institutional players.

| Code | Broker Name | Classification | Key Notes / Strategies / Affiliations |
| :--- | :--- | :--- | :--- |
| **MG** | Semesta Indovest Sekuritas | Local (High Freq) | **The "Sadistic" Scalper.** Known for high-volume scalping, pumping prices high and dumping immediately (Haka/Haki). If MG is the top buyer, expect volatility/drops the next day. |
| **HP** | Henan Putihrai Sekuritas | Local (Conglomerate) | **"Om PP" (Prajogo Pangestu) Vehicle (commonly cited).** Strong flow for Barito Group (BRPT, TPIA, PTRO; also mentioned: CUAN). Often acts as a **price holder** / liquidity provider on bid side for foreign exits. Also frequently seen as **underwriter (UW)** in recent IPO commentary. |
| **ZP** | Maybank Sekuritas | Foreign (Institutional/Crossing) | Frequently mentioned together with **HP** for **PP-related** flow (community mapping: “PP = ZP, HP”). Often used for crossing/strategic routing. |
| **LG** | Trimegah Sekuritas | Local (Conglomerate) | **Thohir Group (Erick Thohir).** Often associated with movers in EMTK, ABBA, or MARI. Flows often indicate mid-to-long term accumulation. |
| **YJ** | Jasa Utama Capital | Local (Conglomerate) | **Tanoko Group (Tancorp).** The primary mover for Hermanto Tanoko’s stocks (CLEO, RISE, ZONE, PEVE). |
| **SQ** | BCA Sekuritas | Local (Big Bank) | **Djarum Group / BCA.** Used by the Hartono family for banking and telco flows (BBCA, TOWR, BELI, RANC). Defensive/Accumulator. Also mentioned as a route used by **Haji Isam** flow (community mapping; mixed with CC/NI). |
| **EP** | MNC Sekuritas | Local (Conglomerate) | **MNC Group (Hary Tanoe).** The distinct mover for MNC stocks (KPIG, BHIT, BCAP, IPTV). Retail-heavy but controlled by the group. |
| **DH** | Sinarmas Sekuritas | Local (Conglomerate) | **Sinarmas Group.** The primary vehicle for DSSA, INKP, TKIM, FREN, and SMART. |
| **AK** | UBS Sekuritas | Foreign (Institutional) | **The "Algo" Giant.** High volume, algorithm-driven. Often drives the direction for liquid LQ45 stocks. |
| **BB** | Verdhana Sekuritas | Local (Institutional) | **The New Giant.** A rising "Big Player" effectively replacing flows from Credit Suisse (CS). Sophisticated institutional flow. |
| **YU** | CGS International | Foreign (Institutional) | Mentioned as a preferred route for **HH (Happy Hapsoro)** flow (community mapping: “HH = YU”). Often seen as strategic institutional entry/exit. |

## 2. Conglomerate → Broker “Andalan” Map (Community-Sourced)

| Conglomerate / Figure | Commonly Mentioned Broker Codes | Confidence | Notes / Context from Thread |
| :--- | :--- | :--- | :--- |
| **PP (Prajogo Pangestu / Barito)** | **HP**, **ZP**, **DX** | **High (HP)** / Medium (ZP, DX) | Multiple comments: “PP = ZP HP” and “PP = DX, HP”. Example notes: HP seen **holding** BRPT around certain levels; HP often top buyer PTRO since Sept 11; HP often appears as **UW** in recent IPO chatter. |
| **HH (Happy Hapsoro)** | **YU**, **ES** | Medium (YU) / Low (ES rumor) | Thread mentions “HH = YU”. Another comment: “HH katanya suka pake broker ES” (rumor). Additional anecdote: broker allegedly buys HH-affiliated names (e.g., BUVA, PTRO, RAJA, RATU, PSKT, UANG) — **still unverified**. |
| **Saratoga** | **XL** | Medium | Mentioned: “Saratoga = XL (Stockbit)”. Note: **XL is retail-heavy**, so interpret carefully (can also reflect retail crowd, not only principal). |
| **Salim Group** | **CC** | Medium | Mentioned: “Salim = CC (Mandiri)”. CC is mixed retail/institutional so signal can be noisy. |
| **Thohir Group** | **LG**, **PD** | Medium | Mentioned: “Tohir = PD, LG” and separately “Thohir = PD”. LG already commonly tagged to Thohir group in bandarmology circles. |
| **Emtek Group** | **KZ** and/or **AZ** | Low–Medium | Mentioned: “Emtek = antara KZ dan AZ”. Treat as tentative. |
| **Haji Isam (“Pak Haji”)** | **CC**, **NI**, **SQ** | Low–Medium | Mentioned in one comment: “Pak Haji = CC, NI, SQ”. Still needs stronger confirmation. |
| **Sinarmas (extra note)** | **DH**, (and **SS** sometimes) | Medium (DH) / Low (SS) | DH already the primary Sinarmas vehicle. A late comment adds: “broker **SS** biasanya dipake konglo, seringnya afiliasi sinarmas” (SS as a possible insider/affiliate route). |
| **PANI / Aguan-related speculation** | **RF** and/or **LG** | Low (speculative) | Comment phrased as a question: “PANI = RF LG ?” Keep as watchlist only. |

## 3. Comprehensive Broker List (Categorized)

### A. Big Brokers (The Market Movers)

*Characterized by massive transaction value and ability to direct market trends.*

| Code | Broker Name | Type | Notes |
| :--- | :--- | :--- | :--- |
| **AK** | UBS Sekuritas Indonesia | Foreign | Top Institutional / Algo-driven. |
| **BK** | J.P. Morgan Sekuritas | Foreign | Top Institutional / Market Leader. |
| **ZP** | Maybank Sekuritas | Foreign | Institutional / Often used for crossing. Also mentioned in community mapping for **PP**. |
| **KZ** | CLSA Sekuritas | Foreign | Institutional (Old money flow). Mentioned as possible route for **Emtek** (tentative). |
| **RX** | Macquarie Sekuritas | Foreign | Institutional. |
| **MS** | Morgan Stanley Sekuritas | Foreign | Institutional (MSCI rebalancing flow). |
| **CC** | Mandiri Sekuritas | BUMN | **Mixed Flow.** Top Local broker, but heavy Retail usage makes "Bandar" tracking harder. Mentioned as possible route for **Salim** and **Haji Isam** (tentative). |
| **YP** | Mirae Asset Sekuritas | Foreign | **Retail King.** Top Retail Volume. If YP is buying, usually retail is FOMO-ing. |
| **NI** | BNI Sekuritas | BUMN | BUMN Flow / Mixed Retail. Mentioned as possible route for **Haji Isam** (tentative). |
| **MG** | Semesta Indovest | Local | High Frequency Trader / Scalper Bandar. |
| **BB** | Verdhana Sekuritas | Local | *Rising Star* (ex-Credit Suisse flows). |
| **YU** | CGS International | Foreign | Top Institutional / Strategic entries. Mentioned as possible route for **HH** (tentative). |

### B. Mid Brokers (The "Pengepul" / Specialized)

*Active in specific second-liner stocks or used for accumulation phases.*

| Code | Broker Name | Type | Notes |
| :--- | :--- | :--- | :--- |
| **AZ** | Sucor Sekuritas | Local | Strong Retail/Asset Management mix. Mentioned as possible route for **Emtek** (tentative). |
| **LG** | Trimegah Sekuritas | Local | **Thohir Group** affiliation. Also appears in some speculation around **PANI**. |
| **HP** | Henan Putihrai | Local | **Prajogo Pangestu** affiliation (commonly cited). |
| **DH** | Sinarmas Sekuritas | Local | **Sinarmas Group** affiliation. |
| **EP** | MNC Sekuritas | Local | **MNC Group** affiliation. |
| **SQ** | BCA Sekuritas | Local | **Djarum Group** affiliation. Also mentioned as possible route for **Haji Isam** (tentative). |
| **YJ** | Jasa Utama Capital | Local | **Tanoko Group** affiliation. |
| **DX** | Bahana Sekuritas | BUMN | Institutional/State-owned flows. Mentioned in community mapping for **PP** (tentative). |
| **IF** | Samuel Sekuritas | Local | Established local broker. |
| **GR** | Panin Sekuritas | Local | Established / Sometimes associated with **Panin Group**. |
| **SS** | Supra Sekuritas | Local | **"Insider" Broker (community lore).** Sometimes linked/adjacent to **Sinarmas**-type flows (unverified). |
| **MU** | CGS-CIMB (Old Code) | Foreign | Often linked (historically) to **Boy Thohir / MDKA** flows in forums. |
| **KI** | Ciptadana Sekuritas | Local | Lippo Group affiliated (historically). |

### C. Retail Brokers (The "Unyu-Unyu" / Market Sentiment)

Brokers are categorized by "Caste" based on their typical user base. This helps identifying retail sentiment vs smart money.

**Highest Caste (Pure Retail)**
*If these are Top Buyers = Distribution (Bandar selling to Retail).*
*   **YP (Mirae)**: "Retail King." Values volume & frequency.
*   **PD (Indo Premier)**: Deep retail penetration.
*   **XL (Stockbit)**: App-based, often follows influencer calls.
*   **XC (Ajaib)**: Gen-Z / Newbie retail base.

**Second Caste (Mixed Retail)**
*   **KK (Phillip)**
*   **NI (BNI)**
*   **EP (MNC)** - *Note: Can be Bandar vehicle for MNC stocks.*

**Third Caste (Institutional/VIP Retail)**
*   **SQ (BCA)**: Wealthier retail clients + Djarum Group insiders.

**Warning Pattern**:
If a traditionally "Pure Retail" broker (like XL or YP) suddenly shows massive, organized buying volume (e.g., 1T lots), it is a strong signal that a **Bandar IS borrowing that broker** to hide their tracks (Camouflage).

## 4. Small / Niche Broker List (For Code Reference)

**Foreign (Asing)**

- **AG** - Kiwoom Sekuritas
- **AH** - Shinhan Sekuritas
- **TP** - OCBC Sekuritas (Regional Flow)
- **GW** - HSBC Sekuritas
- **XA** - NH Korindo (Often used for repo/nominee plays)

**Local (Lokal)**

- **AD** - OSO Sekuritas
- **AO** - Erdikha Elit
- **BQ** - Korea Investment (KIS) - *Note: Actually Foreign/Regional, growing mid-tier.*
- **EL** - Evergreen Sekuritas
- **FZ** - Waterfront Sekuritas
- **IH** - Indo Harvest
- **PI** - Magenta Kapital (Note: Often confused with Phillip/KK in forums, but PI is distinct).
- **SA** - Elit Sukses
- **YB** - Yakin Bertumbuh (Historically partnered with MG for pumps, now less active).

## Caveat

@TradingDiary2 repeatedly highlights the unreliability of "broken summary" (broksum) broker activity analyses through fresh examples, like apparent top foreign broker buys failing to sustain gains or massive retail volumes (e.g., XL/Stockbit 1T lots) leading to letdowns—reinforcing that savvy market makers reverse tactics to trap traders, while replies and tags (e.g., @SarjanaEksu) echo that simplistic summaries mislead, with narratives around stories, conspiracies, conglomerates, or collusion proving more potent than raw broker data, underscoring the need for continuous, adaptable learning as markets evolve against "smart" opponents.
`,
};
