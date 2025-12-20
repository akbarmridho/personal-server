import type { Skill } from "../types.js";

export const sectorCoal: Skill = {
  name: "sector-coal",
  description:
    "Comprehensive guide to the coal industry value chain, technical metrics (SR, GAR, NAR), pricing benchmarks (HBA, ICI), and Indonesian market players.",
  content: `
# Coal Sector Analysis Framework

This skill provides a deep-seated understanding of the coal industry, specifically tailored to the Indonesian market. It covers the end-to-end lifecycle of a mine, key operational metrics, and the regulatory environment.

## 1. The Coal Value Chain
The coal industry operates in five distinct phases:

1.  **Exploration**: Identifying deposits via Geological/Geophysical studies (Seismic, Geoelectric) and Core Drilling to test Calorie, Ash Content, and seam thickness.
2.  **Mine Development**: 
    *   **Feasibility Study**: Calculating Reserves, Strip Ratio ($SR$), and projected Cash-Costs.
    *   **Infrastructure**: Construction of PIT (mining hole), Haul Roads, Disposal areas, Crushers, and Jetty/Rail facilities.
3.  **Production & Processing**:
    *   **Overburden Removal**: Moving the earth covering the coal.
    *   **Extraction**: Using Shovel-Truck methods or Continuous Miners.
    *   **Processing**: Crushing, Washing (to reduce ash/impurities), and Blending different coal qualities to meet buyer specs.
4.  **Transport & Selling**:
    *   **Hauling**: Moving coal from PIT to stockpile via Trucks, Overland Conveyors, or Rail.
    *   **Shipping**: "Estafet" system—Barges (Tongkang) navigate rivers to reach Mother Vessels (60k–180k DWT) in deep sea.
5.  **Reclamation & Closure**: Back-filling pits, re-contouring land, and revegetation. Firms must deposit a "Jamrek" (Reclamation Guarantee) with the government.

## 2. Key Technical Metrics & Ratios

### Strip Ratio (SR)
The $SR$ represents the amount of waste material (overburden) that must be removed to extract one tonne of coal.
$$\text{Strip Ratio} = \frac{\text{Overburden (BCM)}}{\text{Coal (Tonne)}}$$
*   **Lower SR**: Generally indicates lower production costs and higher margins.

### Coal Quality Metrics
*   **CV (Calorific Value)**: The energy content. 
    *   **GAR (Gross As Received)**: Total calories including moisture.
    *   **NAR (Net As Received)**: Net calories after subtracting moisture.
*   **TM (Total Moisture)**: Lower moisture generally signifies higher quality.
*   **Ash Content**: Residue after combustion; lower is better.
*   **TS (Total Sulfur)**: Environmental metric; lower sulfur is more desirable.

### Financial Metrics
*   **Cash Cost**: Direct production costs (fuel, labor, royalties).
*   **ASP (Average Selling Price)**: Heavily influenced by international benchmarks.
*   **Yield Ratio**: Percentage of clean coal obtained after the washing process.

## 3. Pricing Benchmarks & Contracts

### Price Indices
1.  **HBA (Harga Batubara Acuan)**: The official Indonesian government price used to calculate royalties.
2.  **ICI (Indonesia Coal Index)**: Used for spot market transactions in Indonesia.
3.  **Newcastle Coal Index**: The global benchmark for high-calorie coal (approx. $6322 \text{ kcal/kg GAR}$).

### Shipping Terms
*   **FOB (Free On Board)**: Seller is responsible until the coal is loaded onto the ship. Buyer handles freight and insurance.
*   **CFR (Cost & Freight)**: Seller pays to bring the coal to the destination port.

### Sales Contracts
*   **Spot Contract**: Short-term, immediate delivery at current market prices.
*   **Term Contract**: Medium-term ($6-12$ months) with pricing formulas.
*   **Off-take Contract**: Long-term ($3-5$ years), often "Take-or-Pay," ensuring volume even if the buyer's demand fluctuates.

## 4. Regulatory & Market Landscape (Indonesia)

*   **Permits**: 
    *   **IUP**: Standard mining business license.
    *   **IUPK**: Special license for larger, strategic entities or former PKP2B holders.
*   **DMO (Domestic Market Obligation)**: Requirement to sell at least $25%$ of production to domestic buyers (primarily PLN) at capped prices (e.g., $$70/\text{ton}$ for high calorie).
*   **Royalty**: A percentage of revenue paid to the state, scales based on HBA and mine type.

## 5. Industry Player Taxonomy (IHSG)

*   **Upstream (Producers)**:
    *   *Bigcaps*: AADI, BYAN, PTBA, ITMG, BUMI, GEMS.
    *   *Midcaps*: HRUM, INDY, BSSR, MBAP, TOBA.
*   **Midstream (Logistics/Distribution)**: TPMA, MBSS, PSSI, TCPI, RMKE.
*   **Mining Services/Contractors**: UNTR, DOID, PTRO, ADMR, ABMM.
`,
};
