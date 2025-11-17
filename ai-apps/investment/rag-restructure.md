# RAG Restructuring

Weekly market summary -> algoresearch email market mood weekly.
Daily summary -> daily stockbit snips.

The daily summary is split between ticker news and market news.

Then I want to include rumours and analysis as well.

So in short:

- News (fact): Stockbit Snips, Market Mood.
- Rumours: r/JudiSaham (via PRAW. Ada community highlights.), Twitter (via Grok).
- Analysis: AlgoResearch (web), think.id (Instagram), Rivan Kurniawan (Instagram). Split into macro analysis, stock analysis, and sector anaylsis.

I have get market summary to retrieve last 2 month of market summary from market mood as potential index. Maybe just return toc (data id and summary).

tool as internet search to be saved as well and perform similarity search first before perform real search just to save tokens.

include sector tagging? or macro tagging or something that should help search "match".
