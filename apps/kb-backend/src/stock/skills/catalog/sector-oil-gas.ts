import type { Skill } from "../types.js";

export const sectorOilGas: Skill = {
  name: "sector-oil-gas",
  description:
    "Comprehensive knowledge of the oil and gas industry lifecycle, including upstream/downstream phases, operational metrics (BPOED, RRR), and global price benchmarks.",
  content: `
# Oil & Gas Industry Fundamentals

This skill provides a comprehensive framework for analyzing the Oil & Gas (O&G) sector, covering the lifecycle of assets, financial risks, and technical terminology.

## 1. Industry Segments
The industry is divided into three primary segments:
*   **Upstream (Hulu):** Exploration and production (finding and extracting).
*   **Midstream:** Transportation (pipelines, tankers) and storage (floating production storage and offloading - FPSO).
*   **Downstream (Hilir):** Refining crude oil into products like gasoline, diesel, and petrochemicals.

## 2. Asset Lifecycle & Production Phases
An O&G project typically follows five distinct phases:

### Phase 1: Exploration
*   **Licensing:** Companies bid for a Working Area (WK) and sign a **Production Sharing Contract (PSC)**. For example, a contract might dictate an $85%$ share for the government and $15%$ for the contractor.
*   **Surveys:** Includes Seismic 2D/3D (ground USG) and Gravimetric/Magnetic surveys to find potential traps.
*   **Wildcat Drilling:** The first exploration well. Success rates are typically low ($30-40%$). 
*   **Financial Risk (Impairment):** If a well is dry, the exploration cost must be written off as an "impairment," which can significantly hit the company's net profit.

### Phase 2: Appraisal
Once oil is found, **Delineation Wells** are drilled to determine the size and boundaries of the reservoir. This phase defines the **Proven Reserves (2P)**.

### Phase 3: Development
*   **FEED (Front-End Engineering Design):** Detailed technical and cost planning.
*   **EPC (Engineering, Procurement, and Construction):** Building rigs, pipelines, and facilities.
*   **Injection Wells:** Drilled to maintain reservoir pressure.

### Phase 4: Production
*   **Primary Recovery:** Natural pressure pushes oil out (covers $approx 5-15%$ of total).
*   **Artificial Lift:** Using **Electric Submersible Pumps (ESP)** or Gas Lift to help oil reach the surface.
*   **Secondary/Tertiary (EOR):** Waterflooding, Steam Injection, or $CO_2$ Injection to extract the "last drops." Can add $20-30%$ to production.
*   **Maintenance:** Includes **Pigging** (cleaning pipes) and **Work-over** (well repairs).

### Phase 5: Abandonment (P&A)
**Plug and Abandon (P&A)** involves sealing wells with cement to prevent leaks and dismantling all infrastructure to restore the environment.

## 3. Key Operational Metrics & Ratios

| Metric | Description |
| :--- | :--- |
| **BPOED** | **Barrel Oil Equivalent per Day**. A unit to combine oil (bbl) and gas (MMCFD) production into a single figure based on energy content. |
| **Decline Rate** | The annual percentage drop in natural production from a well. High decline rates require constant new investment. |
| **RRR** | **Reserve Replacement Ratio**. Measures if a company is finding enough new reserves to replace what it produces. Goal: $>100%$. |
| **Recovery Factor** | The percentage of oil in the ground that can actually be extracted. |
| **OOIP / OGIP** | **Original Oil/Gas In Place**. The total volume estimated to exist before production began. |
| **OPEX per BOE** | Operating expense per barrel. Lower values indicate higher efficiency and better margins. |

## 4. Technical Quality
*   **API Gravity:** Measures oil density. High API ($>40^circ$) is "Light" (easier to refine); Low API ($<25^circ$) is "Heavy" (thick/viscous).
*   **Sulphur Content:** **Sweet** oil has low sulphur (premium price); **Sour** oil has high sulphur (higher refining costs).

## 5. Global Benchmarks
*   **Crude Oil ($1$ barrel $approx 159$ liters):**
    *   **Brent:** Standard for Europe/Africa/Middle East.
    *   **WTI (West Texas Intermediate):** Standard for US markets.
*   **Gas (Measured in MMBtu):**
    *   **Henry Hub:** US benchmark.
    *   **TTF:** European benchmark.
    *   **JKM (Japan Korea Marker):** Asian benchmark, relevant for Indonesia.

## 6. Cost Comparisons (Onshore vs. Offshore)
Offshore drilling is significantly more expensive due to equipment rental (Rigs can cost $$300k-$600k/day$), complex logistics (helicopters/ships), and extreme weather risks. While costlier, offshore fields often contain much larger reserves than onshore fields.
`,
};
