# Executive Summary

- **Enhanced transparency.**  As of early 2026 Indonesian regulators have mandated monthly public disclosure of all shareholders above 1% (down from 5%), broken out by investor type【23†L115-L123】【68†L680-L689】.  KSEI/IDX will publish these as a “shareholder concentration list” to improve visibility of the ownership map.  OJK has also committed to providing *below-5%* holdings (with investor categories) and identifying ultimate beneficial owners for global index providers【68†L680-L689】【40†L680-L689】.  

- **Controller vs float.**  Analysts must clearly identify the **ultimate controller** and related affiliates (parents, families, holding‐company chains). Indonesia’s market is characterized by **high ownership concentration**: controlling shareholders (often families or state entities) typically command decisive voting power【32†L323-L332】.  By contrast, the **tradeable supply** can be extremely thin.  Glass Lewis notes that the “actual free float is often lower than the headline… figure”【32†L402-L408】. Reported free float (per IDX rules) excludes controller and affiliates【14†L326-L334】, but further adjustment is needed to arrive at an *effective float* available to investors.

- **Holder categories.**  We recommend categorizing holders into groups that reflect strategic alignment and liquidity: e.g. **Controller/affiliates**, **management/insiders**, **strategic partners**, **domestic institutions**, **foreign institutions**, **passive/index investors**, **retail/others**, and **nominee/custody accounts**. Each category carries different implications. For example, strategic or index funds are typically long-term (“sticky”) but effectively reduce tradable float, whereas some institutional holdings may be opportunistic. Nominee and omnibus accounts (common in Indonesia) conceal the true owner and should be flagged as *unknown-beneficial*, since they can mask both local and foreign investment flows【65†L101-L109】【65†L119-L127】.

- **Concentration metrics.**  Quantitative measures help flag risk. Useful metrics include the sum of the top 3–5 shareholders and a Herfindahl-type concentration index.  Given Indonesia’s thin floats, even a few moderate stakes imply high concentration.  For minority investors it is often more meaningful to compare the largest non-controller block or the fragmentation of the remaining float than just the controller’s stake.

- **Overhang/supply risk.**  Detecting future selling pressure is critical. Analysts should scan filings for rights issues, private placements, convertible bonds or pledges by large shareholders.  For example, a new controlling investor may be required to conduct a mandatory tender offer (as recently happened when POSCO’s unit took control of Prime Agri and launched a 34% tender offer【63†L120-L127】).  Similarly, large share pledges (now reportable under POJK No.4/2024) signal that margin calls could flood the market【51†L678-L687】.  Any lock-up expirations or insider selling should be noted as red flags.  

- **Minority alignment.**  Ownership structure heavily colors governance.  Extremely high controller ownership (especially with opaque pyramids or affiliate networks) creates **tunneling risk** and weak minority protection【32†L323-L332】.  Conversely, a dispersed float with many independent institutional holders suggests better alignment.  Analysts should treat structure as a core input to minority risk – often even more telling than board credentials – and flag any signs of self-dealing (e.g. cross-holdings, related-party transactions) hidden by the ownership map.

- **Dynamics over time.**  Changes in the shareholder base are narrative triggers.  A large new investor (especially strategic or foreign) can be constructive if it brings expertise or capital, but its exit could be destabilizing.  Watch for rising concentration or shrinking float as scarcity narrative, and sudden dilution (e.g. new share issuance) or repeated insider sales as danger signs.  In short, **who got in or out and why** matters as much as the static snapshot.

- **Data limitations and uncertainty.**  Indonesia’s nominee/custody system means much ownership is obscured.  Analysts must explicitly mark ambiguity.  Where beneficial owners are unknown (e.g. a custodian account holds 10%), that portion of the float should be treated conservatively (e.g. worst-case available for sale).  Avoid overconfidence in automated classifications: if an investor’s “type” is unclear, note it.  Our framework will therefore output ranges or risk flags (e.g. “effective float uncertain”) whenever data is incomplete.

- **Deterministic vs. judgment.**  Many basic fields can be computed (controller stake, top-10 sum, reported free float under IDX rules【14†L326-L334】, etc.).  By contrast, estimating the true tradable supply or categorizing a holder as “strategic” vs “passive” requires analyst judgment.  The deliverable should clearly split machine-derived values and subjective assessments (with rationale), so the parent workflow can weight confidence accordingly.

- **Integration into workflows.**  The output should be a concise structured summary accessible to both `fundamental-analysis` and `narrative-analysis`.  At minimum it should label the controller, quantify reported vs. effective float, list major holders by category, note key concentration stats, and flag any overhang or alignment issues.  This lets fundamental analysis incorporate ownership and governance into its rating, and narrative analysis quickly see if recent share movements warrant a story (e.g. new strategic investor or overhang risk).  

# Recommended Ownership Model

The shareholder-structure module belongs under **fundamental analysis**, focusing on capital structure and minority implications – *not* on price timing or charting.  It should be built to answer “Who controls the company and how much stock is available to others?” rather than “Is the stock about to breakout?”.  Specifically, it should:

- **Focus areas (Fundamental analysis):** Identify the **ultimate controller** and any affiliated entities (holding companies, cross-held subsidiaries, family trusts), quantify their combined stake, and note any changes in control.  Compute reported free-float per IDX rules (excluding controller/affiliates, insiders, treasury)【14†L326-L334】.  Categorize the remaining shareholders by type (see taxonomy below) and measure how concentrated they are.  Flag any corporate actions (new share issuance, offerings, pledges) affecting supply.  Assess minority alignment by noting any red flags (tunneling, cross-shareholdings, etc.) implied by the structure.  These outputs feed directly into the fundamental “governance/ownership” factor and into valuation/liquidity analysis (e.g. free-float discount or supply scenario).  

- **Secondary use (Narrative analysis):** Shareholder changes or structure facts can feed into the stock’s story.  For example, a **new strategic investor** taking >5% might be a bullish catalyst, while a **share-placement overhang** or **locking-up** of float can become a bearish narrative.  The shareholder module should emit triggers (e.g. “new >5% holder in Apr 2026”) in a way the narrative workflow can consume.  However, it should *not* attempt to predict price moves or substitute for flow/trading analysis – that remains outside its scope.

- **Exclusions:** This model should **not** include any timing or execution guidance (no entry points, stops, or target ladders) and should not perform broker-flow or technical chart analysis.  Its domain is strictly structural: ownership, free-float, supply, and governance alignment.

# Recommended Analytical Framework

A step-by-step process for shareholder analysis:

1. **Data collection:**  Gather the latest **KSEI 1% shareholding data** and official IDX disclosures (annual reports, change-of-control announcements, rights issue prospectuses, etc.).  Compile related metadata (company profile, capital structure, board/share info).  This should be automated as much as possible (e.g. retrieving monthly KSEI snapshots and parsing filings).

2. **Identify controller and affiliates:**  From the data, determine the *ultimate controlling shareholder*.  This may be obvious if one party holds a majority of outstanding shares.  If no single party has 50%, look for *control-enhancing structures* (pyramids, dual-class shares, or cross-holdings) or effective voting coalitions (families, groups).  Mark the controller entity (or entities, if joint control) and aggregate all shares it controls through affiliates.  Use regulations or official filings when available: e.g., IDX defines affiliates and free-float exclusions in Circular Letter SE-00010/BEI/07/2023【14†L326-L334】.  

3. **Combine scripts and scriptless:**  Indonesian shares can be either **script (certificated)** or **scriptless (book-entry)**.  KSEI manages scriptless holdings; the Biro Administrasi Efek (BAE) reports script holdings.  OJK now requires combining these into the 1% reports【23†L161-L170】.  Ensure total issued shares, treasury (if any), and outstanding figures are correct by summing both sources.  

4. **Categorize holders:**  Tag each large shareholder by category (see *Holder Taxonomy* below).  Typical categories: Controller/Affiliate, Management/Insider, Strategic Investor, Domestic Institution, Foreign Investor, Passive/Index, Retail, and Nominee/Custodian.  Use available metadata (e.g. company disclosures often list commissions with significant holdings) and the KSEI investor-type flags.  For example, KSEI’s new data provides “corporate” vs “others” vs “institutional” tags【23†L171-L174】.  For foreign vs domestic, note that administrative labels may be misleading (a Cayman fund might be marked “foreign”【65†L119-L127】).  Treat any large omnibus account or custodian (“Nominee QQ Bank X”) as *uncertain* – we cannot assign its shares confidently to domestic or foreign.  

5. **Compute reported free float:**  Sum the share percentages held by all non-excluded parties.  By IDX’s definition【14†L326-L334】, free float is shares **not** held by the controller/affiliate, board members, or the company itself.  (Affiliates with <5% may *count* as free float per a recent circular【14†L335-L343】.)  This gives the “headline” free-float percentage.  Compare it to regulatory thresholds (e.g. 7.5% old minimum, proposed 15%【23†L139-L142】【68†L694-L702】).  Flag if below minimum or if it has tightened over time.  

6. **Estimate effective float:**  Adjust the reported free float for likely non-tradable shares.  For example, *strategic or passive* institutional stakes (think pension funds, long-term government holdings) may be largely inert.  *Index funds* or *(mutual fund)* passive holders further reduce liquidity even if included in free-float.  One approach is to categorize such holders and either exclude them or count them as only partially “available.”  At minimum, note such holdings explicitly.  If many shares are in nominee accounts or by insiders, mark the effective float as uncertain or significantly lower than the headline.  (Glass Lewis warns that Indonesia’s true float is often much smaller than reported【32†L402-L408】.)  We suggest producing a *range* for effective float (e.g. “5–15%”) or a float risk level rather than a single crisp number.  

7. **Assess concentration:**  Calculate simple metrics: e.g. the combined percentage of the top 3 or top 5 shareholders (excluding controller) and a Herfindahl index of share percentages.  If one non-controller owns >X%, note it (e.g. “largest non-controller holds 20%”).  Also measure fragmentation: count holders above small thresholds (e.g. above 1%).  A very concentrated non-controller base (few large holders) is riskier for liquidity and minority interest than a widely dispersed float.  

8. **Spot supply overhangs:**  Identify any imminent sources of new supply.  Scan corporate-action filings for rights issues, private placements, or employee stock plans that will add shares.  Check major shareholders’ activities: large **share pledges** (since Aug 2024 these are disclosable【51†L678-L687】), upcoming **lock-up expiries** (if IPO or tender-offer had lockup dates), or explicit sale agreements.  Note any **mandatory offers** (as in the POSCO/SGRO case【63†L120-L127】) or secondary distributions.  Any of these should be logged (e.g. “Unsubscribed rights issue – 10% of shares in May 2026”).  

9. **Evaluate minority alignment:**  Finally, interpret what the structure implies for governance.  High controller ownership with little independent float is a red flag (OECD notes that Indonesian listed firms often have *“controlling shareholders…retaining decisive influence”*【32†L323-L332】).  Look for patterns of potential tunneling: complex pyramids or inter-company holdings that could mask intra-group transfers.  Conversely, a balanced mix of unrelated institutional holders is a positive sign.  This step is inherently qualitative, but the analysis can flag obvious concerns (e.g. if >90% is controlled by one family).  

10. **Document and output:**  Summarize the findings in a structured form (see *Output Contract* below).  The report should list the controller, key categories and their stakes, reported vs effective float estimates, concentration stats, and any overhang or governance issues.  Be explicit about uncertainties (e.g. **“Effective float very low: likely <10%”** or **“UBO unknown for 30% held in nominee accounts”**).  These outputs will feed into the broader equity analysis: the fundamental team uses them for valuation and governance risk, and the narrative team flags notable events (new investors, supply risk, etc.) for storylines.

# Holder Taxonomy

We recommend grouping shareholders into decision-useful categories.  These categories help interpret alignment and liquidity:

- **Controller / Affiliate (Promoters):**  The ultimate owner(s) and any related entities (parent companies, subsidiaries, founders’ trusts).  This group dictates control.  Shares here are essentially *not* available for trading (unless a change-of-control is underway).  Depth: list entity and effective stake.  

- **Management / Insiders:**  Board members and senior management holdings (if any).  Usually small in Indonesia, but still a line item.  Insiders can be subject to lock-up rules or reporting.  

- **Strategic Investors:**  These are stakes by parties with a strategic relationship (e.g. joint-venture partners, a corporate investor, or a long-term anchor).  They tend to hold for strategic reasons, not for short-term profit, and are generally *sticky*.  However, they are *not* affiliated with the controller.  Large strategic stakes can effectively tighten float (since they may not sell easily) but often stabilize governance if aligned with management.  

- **Institutional – Domestic:**  Local institutions (banks, mutual funds, insurance companies, pension funds, state-owned enterprises).  These can be strategic (e.g. state holding company) or financial (asset managers).  Domestic institutions may have relationships with the issuer or local market (monitor for any earmarking or support).  

- **Institutional – Foreign:**  Foreign institutions and funds.  As [IDNFinancials] notes, these often appear in registers under custodian names (e.g. global custodians “QQ” accounts)【65†L101-L109】.  They may be more price-sensitive and potentially quick to exit.  However, note that some foreign-owned shares might be held through Indonesian intermediaries, which muddies the classification【65†L119-L127】.  In practice, treat any known foreign fund as such, but use caution: round-tripping (local owners using foreign accounts) can distort the data.

- **Passive/Index Funds:**  These include index funds, ETFs or very long-only mutual funds that largely track the market.  They tend to buy and hold with minimal turnover.  If their identities are known (e.g. large passive fund names), list them.  If not, a portion of the float will implicitly be passive – one may infer this by exclusion.  Important: passive holders *reduce tradable float* because they will not sell unless index rebalances or extraordinary flows occur.

- **Retail / Other Public:**  Individual investors and small accounts without a strategic motive.  This bucket is usually the most fragmented and the source of most daily trading.  It’s “the crowd.”  A high proportion of retail ownership means liquidity may be better, but also price can be driven by sentiment.  Retail holdings often come via nominee accounts anyway.

- **Nominee/Custody / Unclear Beneficial:**  Any shares held by custodians or in omnibus (collective) accounts whose beneficial owners are not identified.  Common in Indonesia for both local and foreign institutions.  These should be clearly flagged and **not** assumed equivalent to retail or any one category.  For example, 20% held under “Custodian Bank – Q.Nominee” might turn out to be foreign fund or local; this is ambiguous and treated as *uncertain float*.  Analysts should note such blocks and, if possible, investigate further (e.g. via disclosure notices or enquiry).  

- **Treasury Shares:**  Shares held by the company itself.  These are typically locked and canceled on books, not traded.  With dematerialization, true “treasury” stock is rare; if present, remove from share count.

Each category should be interpreted for minority impact and liquidity.  For instance, multiple **small unrelated institutions** are generally positive for governance (diversified oversight) and tradeable supply.  By contrast, a **few large passive or nominee blocks** shrink real float and raise volatility.  The taxonomy fields should capture both share count (or %) and qualitative notes on each group’s behavior (sticky, supportive of controller, etc.).  

# Effective Float Framework

Indonesia’s regulatory “free float” is only a starting point.  The **headline free-float** (as per IDX: shares not held by controller/affiliates, insiders, treasury) can be misleading in practice【14†L326-L334】【32†L402-L408】.  We propose the following approach:

- **Baseline:**  Start with reported free float = 100% – (controller + affiliates + insiders + treasury).  This follows IDX definitions【14†L326-L334】.  (By circular letter, affiliates under 5% are *included* in free float【14†L335-L343】.)  Compare to minimum thresholds; e.g. OJK/IDX has signaled a 15% free-float standard【23†L139-L142】【68†L694-L702】.

- **Discount for strategic/passive:**  Subtract or mark long-term holders.  For example, if 5% of shares are held by a government fund and another 5% by an index fund, one might count only part of those as “effectively available.”  In practice, we can either exclude them entirely from effective float or apply a factor (e.g. count 50% of each passive stake).  At a minimum, flag large passive blocks as *sticky float*.

- **Adjust for lock-up/pledge:**  If remaining free-float shares have legally binding restrictions (lock-ups post-IPO or M&A), remove those until they expire.  Likewise, if a large shareholder has pledged shares as collateral, recognize that a margin call could force up to that stake into the market.  (OJK now requires >5% pledges to be reported【51†L678-L687】; use that info to adjust float.)

- **Range and uncertainty:**  Because beneficial ownership is often opaque, express effective float as a range or risk level.  For example, if 25% is reported free float but 10% is in “unclear/nominee” accounts and 5% in a known passive fund, we might say effective float is “10–15%”.  If many assumptions are involved, mark it explicitly (“Effective float highly uncertain”).  Glass Lewis emphasizes that in Indonesia the gap between headline and real float has been large【32†L402-L408】; our framework should default to conservatively low float if doubt exists.

- **Narrative interpretation:**  Categorize float as **“ample,” “adequate,” or “tight.”**  For instance, under 10% effective float might be labeled “extremely tight (high liquidity risk)”, 10–20% “moderately tight,” above 25% “healthy.”  These categories (or numeric bounds) can help the parent workflow judge volatility risk and exit challenges in downstream models.  

In short, analysts should compute the formal free-float number but then apply judgmental discounts for any portion likely not tradable.  The reasoning (e.g. “–5% for index fund, –3% for lock-up”) should be documented.  Where float can’t be pinned down, use conservative assumptions and note the uncertainty.  

# Concentration and Overhang Framework

**Concentration:**  We recommend two practical measures:

- *Top-n share:*  Calculate the sum of the top 3 and top 5 shareholders (as % of total shares).  Especially note the split between the controller and “the rest”.  E.g. “Controller = 60%, next 4 = 10% combined” signals extreme concentration.  Also compute the *Herfindahl–Hirschman Index (HHI)* of share ownership if possible (squaring each holder’s % and summing).  A high HHI indicates few large holders.  Use these to categorize overall concentration (e.g. HHI > 2000 or top-5 > X% = “highly concentrated”).  These are straightforward to compute and feed into risk models.  

- *Float fragmentation:*  Assess how the remaining free-float is distributed.  Count how many distinct holders hold more than, say, 1% or 5%.  If only a handful, the float is effectively controlled by a few.  If dozens of small holders, the float is more fragmented (and individually small trades have smaller impact).  Consider also the nature of those holders (from the taxonomy) – e.g. 5% held by an index fund vs. 5% split among 10 small accounts are very different for stability.  

**Overhang/Supply Risk:**  Identify likely future supply pushes.  Key signals include:

- *Corporate actions:* Check if a rights issue, private placement, convertible issuance, warrant exercise, or bonus share plan is planned or recent.  For example, an upcoming rights issue where a large shareholder is not participating could flood the market with unsold entitlements.  Public filings (prospectuses, regulatory filings) are the source.  

- *Tender offers / takeovers:* A new large owner may trigger a mandatory tender.  In SGRO, for instance, the change in control by Posco led to a required tender offer for 34.3% of shares【63†L120-L127】.  Any announced tender, buyback or squeeze-out offer is a material supply event to note.

- *Pledges and margin risk:* Large pledged positions (now disclosed) can become supply if margin calls occur.  For example, if a 15% stake is pledged as collateral, up to that amount could end up for sale if debt is called.

- *Lock-up expiries:* If the issuer recently had an IPO or private placement, check the lock-up period for founders/insiders.  As soon as it lapses, those shares can hit the market.  

- *Unfriendly holders:* Note any activist or rumored-seller stakes.  E.g., if a strategic partner with no good reason suddenly sells even a part of its block, that may signal more to come.

In practice, build a checklist that queries filings for these events.  Each identified risk should be summarized (type, size, expected date) in the output.  For narrative use, classify each as “constructed (e.g. strategic buy-in), neutral, or dangerous (selling or dilution)” in tone, to help gauge whether a holding change is market-positive or -negative.

# Deterministic vs Judgment Split

Our framework clearly separates **machine-computable fields** from **analyst judgments**:

- **Deterministic (Structured) elements:**  These include raw data and calculations that can be extracted from filings without interpretation. Examples: the controller’s name and percentage; each shareholder’s percentage; the official free-float percentage per IDX rules【14†L326-L334】; counts of holders above 1%, 5%, etc.; Herfindahl index.  Also corporate-action facts (e.g. “rights issue of X shares at Y date”) are deterministic from regulatory disclosures.  These can be fully automated once the data is fed in.

- **Judgment-required elements:**  These involve assessing intent, liquidity, and risk. Examples: classifying a large holder as “strategic partner” vs “financial investor” (unless explicitly labeled); estimating *effective* float by discounting passive blocks; rating minority alignment (healthy vs weak); and the significance of changes.  For instance, deciding that a 8% stake is essentially “float” or “locked” depends on context (lock-up terms, investor type) and requires human insight.  Similarly, inferring that an investor is likely to sell soon (e.g. an activist) is qualitative.  

   We must provide a structure to capture these.  Possible approach: output separate fields like `effective_free_float_min`, `effective_free_float_max`, or a “float_uncertainty” flag; and brief *justifications* for each estimate.  For alignment, use a categorical flag (e.g. `alignment: strong/weak`) with a short note (e.g. “High controller stake + family network【32†L323-L332】”).  In general, any non-numeric or fuzzy assessment should come with a comment or confidence level.  

- **Expressing uncertainty:**  Wherever ambiguity exists (especially around nominees or incomplete data), the output should explicitly say so.  For example, if 25% of shares are in nominee accounts whose owners are unknown, the report might include: *“Nominee-custody holdings 25% – beneficial owners not disclosed.”*  This reminds users that portions of the float are effectively black-box and should be treated cautiously.  We prefer ranges or qualitative descriptors (e.g. “Effective float likely <10%”) over false precision.  

In sum, the solution should be 80% plug-and-play data extraction plus calculation, and 20% human analysis.  The machine can flag issues (e.g. “controller increased stake” or “free float below threshold”), but the analyst must interpret their implications.  

# Output Contract Recommendation

The shareholder analysis should emit a **compact structured report** with key fields.  Suggested components (in pseudo-JSON or table form) include:

```
{
  "controller": { "name": "Entity A", "ownership_pct": 42.0 },
  "controller_affiliates_pct": 15.0,
  "insiders_pct": 2.0,          // Board & management
  "strategic_investors_pct": 5.0,
  "institutional_domestic_pct": 10.0,
  "institutional_foreign_pct": 8.0,
  "passive_index_pct": 5.0,
  "retail_pct": 8.0,
  "nominee_custody_pct": 25.0,
  "treasury_pct": 0.0,
  "reported_free_float_pct": 43.0,    // per IDX definition
  "effective_free_float_pct": [12.0, 20.0], // range reflecting uncertainty
  "float_notes": "25% held in nominee accounts (beneficial owners unknown); major funds are long-term",
  "concentration_top5_pct": 75.0,
  "concentration_index_HHI": 3200.0,
  "largest_shareholders": [
      {"name":"Entity A (controller)","pct":42.0},
      {"name":"Foreign Fund X","pct":5.0},
      {"name":"Insurance Co Y","pct":3.0},
      {"name":"Idx ETF Z","pct":3.0},
      {"name":"CEO Mr. B","pct":2.0}
  ],
  "overhang_events": [
      { "type":"Rights Issue", "size_pct":10.0, "date":"2026-04", "notes":"33% unsubscribed, potential 3% free float increase" },
      { "type":"Mandatory Tender Offer", "size_pct":34.3, "date":"2026-02-21 to 2026-02-19", "notes":"New controller buying shares【63†L120-L127】" }
  ],
  "minority_alignment": "Weak – high controller/affiliate stake & opaque cross-holdings",
  "other_risks": "Large insider pledge (5%) noted; free float < proposed 15%【23†L139-L142】",
  "last_update": "2026-03-01"
}
```

This payload includes both quantitative fields and interpretive notes.  For ease of machine use, numeric fields (`ownership_pct`, `reported_free_float_pct`, etc.) should be separate from free-text notes.  `effective_free_float_pct` is given as a range [min, max] to encode uncertainty.  The `overhang_events` array summarizes upcoming supply pressures (with references where needed).  `minority_alignment` and `other_risks` capture qualitative judgments.  

This structured output allows:  

- **Fundamental analysis** to ingest numbers (e.g. reported vs effective float, concentration) into models or dashboards and see flagged issues.  
- **Narrative analysis** to quickly detect story elements (e.g. presence of new investor or big rights issue) without re-parsing raw disclosures.  

All fields should be updated whenever new shareholding data arrives.  Any time-series changes (e.g. controller’s stake up/down) should trigger a log or flag in the report so the parent synthesis workflow can note the trend.

# Practical Failure Modes

Common pitfalls and how to avoid them:

- **Blindly trusting “headline” data.**  The official free-float or top-shareholder list can be misleading if one ignores hidden ownership.  For example, a nominee account hides true investors【65†L107-L113】.  Analysts sometimes count all non-controller shares as equal, but as Glass Lewis warns, *“actual free float is often lower than the headline… figure”*【32†L402-L408】.  **Guard:** Always adjust for known sticky blocks or ambiguities. When in doubt, assume the smallest plausible float.

- **Ignoring nominees/omnibus.**  Given Indonesia’s custody system, many large stakes appear under names like “Custodian Bank – Q.Nominee.”  Assuming these are retail or lumping them with public float is wrong.  As one practitioner notes, a foreign fund may be recorded as domestic or vice versa【65†L119-L127】.  **Guard:** Explicitly treat nominee holdings as “uncertain”: do not include them in liquid float unless the beneficial owner is revealed by subsequent disclosure.

- **Static snapshots vs. dynamics.**  Failing to track changes over time leads to stale analysis.  A company might meet float rules one year but fall below after a block sale.  Remember that OJK cut reporting delays (now 5 business days【51†L678-L687】) so shareholder data can shift quickly.  **Guard:** Maintain a history of key fields (controller identity, free-float %, major holders) and highlight material changes in the report.

- **Overcounting affiliations.**  Double-counting is possible if an affiliate’s stake is also partly held through a nominee.  Also, not all holdings by related parties may be obvious.  **Guard:** Be conservative: cross-check any large stakes for related parties (common addresses, names, or corporate links).  Use known affiliation lists (if available) or regulatory filings (OJK may list shareholders and their status).

- **Overconfidence in categories.**  Don’t rigidly assign every shareholder to a neat bucket if evidence is thin.  For instance, a 4.9% stake by a mutual fund could be either strategic or just financial.  Don’t pretend to “know” what long-term investors will do.  **Guard:** Where classification is uncertain, note it (e.g. “Institutional fund X – role unclear”).  Provide defaults (e.g. treat sub-5% affiliates as float per rule【14†L335-L343】 but footnote it).

- **Ignoring enforcement risk.**  Good float percentages on paper may hide dilution risk.  For example, if a major shareholder has a loan and his shares are pledged, there’s a latent supply risk.  New regulations (e.g. POJK on pledges【51†L678-L687】) exist because these failure modes are real.  **Guard:** Use regulatory filings and news to spot pledged shares, pending share distributions or privatizations not yet closed.

- **Mis-reading investor type data.**  KSEI’s new categorization will help, but remember it’s based on account registration, not actual behavior.  A foreign pension fund running in JF Hutasoit’s name via Citibank is still foreign in influence, even if tagged “domestic” by SRE status【65†L119-L127】.  **Guard:** Treat “Foreign” vs “Domestic” labels with caution.  If funds flows data (e.g. ID-Negara vs ID-Domestic) doesn’t match market moves, it may be due to classification quirks.

In sum, sloppy shareholder analysis often comes from treating incomplete data as complete and from ignoring Indonesian peculiarities (nominees, cross-holdings).  To guard against this, the framework insists on explicitly calling out uncertainty and potential blind spots in every report.

# Suggested Revisions to the Skill

To implement this analysis in the existing fundamental-skill framework, we recommend the following concrete enhancements:

- **Data inputs:**  Integrate monthly KSEI 1% holdings data once available (as announced【23†L115-L123】).  Ensure the skill fetches both script and scriptless records (KSEI and BAEx feeds) and combines them as OJK requires【23†L161-L170】.  Also, parse any new OJK/IDX filings for share pledges (POJK 4/2024【51†L678-L687】), rights issues, tender offers, or buybacks.  

- **New fields:**  Add explicit fields for *controller identity* (name, nation, holding structure) and *sum of affiliates’ shares*.  Include numeric fields for *reported free float* and *effective float range*.  Flag if free float <15% (soon to be the norm【23†L139-L142】【68†L694-L702】).  Add a boolean flag `pledged_shares` if any >5% stake is pledged (from POJK disclosure).  Include an `ultimate_beneficial_owner_known` indicator (true/false) and if false, mark the percentage of shares under nominee ambiguity.  

- **Categories output:**  Extend the skill’s output contract with holder-type breakdown (as in the example above).  If possible, automate the mapping from KSEI’s investor-class codes【42†L25-L33】 into our categories (e.g. code 020 = SOE under “State/Corporate”, code 041 = Foreign Bank, etc.), but allow manual override.  

- **Concentration metrics:**  Compute and output top-5 share percentage and a simple concentration index.  If the skill already has a holdings list, add logic to square-sum for HHI or just sum top-n.  Output comments if, say, >X% held by a single shareholder (an obvious majority) or if Top5 > 50%.  

- **Governance check:**  Cross-check against corporate governance disclosures.  If the controller is a related party to the board or if there are known related-party transactions, append a note.  (This ties into the broader governance skill.)  For example, if a shareholder in the list is also the CFO or a parent company of a director, flag it.  

- **Uncertainty handling:**  Introduce a mode or flag for “beneficial ownership uncertain.”  For any nominee account or conflict between data sources, set a caution flag.  Potentially output ranges instead of point values.  Ensure the skill’s documentation makes clear which fields are factual versus interpretive.  

- **Narrative hooks:**  As optional output, include a summary sentence or bullet for any major changes since the last report (e.g. “New 5% holder entered in Jan 2026: Foreign Fund A【23†L115-L123】”).  This can help narrative modules quickly see what changed.  

- **Validation & notes:**  Since Indonesian data can be messy, add cross-checks (e.g. ensure total shares sum to 100%, or compare free float to share count to catch errors).  In cases of discrepancy, emit an error flag.  Also, have the skill footnote sources of data (e.g. “1% List dated 2026-03” or “IPO prospectus April 2025”) in a `data_sources` field.  

- **Guidance/documentation:**  Update the skill’s guidelines to explain the new logic: e.g. cite IDX Circulars for free-float definitions【14†L326-L334】, link to OJK press for context (15% rule【68†L694-L702】).  Make clear what is automated vs. what analysts must supplement.  Provide examples of “good” and “bad” shareholder reports for training.

These changes will make the shareholder analysis both richer and more systematic.  They avoid vague advice by specifying exactly how to parse Indonesian disclosures, how to compute each metric, and what to output.  

# Source Notes

- **Regulatory and Primary:** OJK press releases and IDX rule clarifications were key.  In particular, OJK’s Jan 2026 press release mandated disclosure of *all* share ownership (above/below 5%) by type on the IDX site【68†L680-L689】, and announced a 15% free-float requirement【68†L694-L702】.  POJK 4/2024 (Apr 2024) requires timely reporting of share pledges【51†L678-L687】.  IDX circulars (via White & Case) define free-float and affiliates【14†L326-L334】.  We treated these as primary standards.  

- **Practitioner analyses:** We relied heavily on Glass Lewis (Decky Windarto) for insights on float scarcity and concentration【32†L279-L288】【32†L323-L332】.  That research ties MSCI’s 2026 actions to Indonesia’s structure issues and explicitly notes the discrepancy between “headline” and true free float【32†L402-L408】.  The White & Case update provided concrete definitions of free float and affiliates under IDX rules【14†L326-L334】.  An IDNFinancials KSEI news piece documented the actual rollout of >1% disclosure and investor-type data【23†L115-L123】【23†L161-L170】.  These practitioner sources guided our quantitative framework.

- **Market reporting:**  Indonesian business news (Kontan, IDNFinancials) gave practical examples.  For instance, IDNFinancials reported on “finfluencers” as >1% shareholders, illustrating that even private traders can hold large stakes【24†L61-L69】.  A Kontan story on Prime Agri (SGRO) detailed a change of control and associated mandatory tender offer【63†L120-L127】, showing how new controllers inject supply.  An IDNFinancials article compared Malaysian vs Indonesian nominee disclosure practices【65†L101-L109】【65†L119-L127】, highlighting how limited transparency remains in Indonesia.  These news sources were used to validate our assumptions (e.g. nominee ambiguity) and to flesh out examples, but we relied on the regulatory policy for hard rules.

- **IR perspective:**  We also referenced shareholder-analysis best practices from an IR standpoint (e.g. Proxymity) to ensure our model covered the right dimensions of ownership disclosure【17†L208-L215】.  These helped shape the workflow even though they aren’t Indonesia-specific.

- **OECD/governance context:**  Background OECD work on Indonesian beneficial ownership【45†L254-L331】 was used to understand structural issues (e.g. nominee accounts previously used to hide ownership) but we did not quote it directly due to length.  Instead, we used it to confirm that identifying controllers and exposing nominee accounts is consistent with international governance advice.

Each recommendation above is grounded in these sources or in well-established market practice. Citations are provided for any standard or concept not common knowledge (especially regulatory definitions and recent reforms). We distinguish **official rules (IDX/OJK)** from **heuristics or commentary (Glass Lewis, news)**. All citations listed refer to primary regulatory releases or credible practitioner commentary (not retail blogs or uncited opinions). Any rule stated without a citation (e.g. how to categorize owners) is a reasonable heuristic derived from combining these sources and common market practice.
