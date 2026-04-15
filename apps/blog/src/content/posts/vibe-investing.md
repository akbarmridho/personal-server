---
title: 'Vibe Investing AI: Lesson Learned building AI Agent that Became No-as-a-Service'
description: 'Building an AI-powered investment analyst for the Indonesian stock market — from data pipelines and custom tooling to memory architecture, skill design, and what 80+ sessions taught me about where LLMs actually break down.'
pubDate: 2026-04-09
author: 'Akbar Maulana Ridho'
tags: ['agentic-ai', 'idx', 'investing']
---

As an "investor" who taught to focus on fundamental stocks. I only know BBCA and BMRI. Other stocks? too scary. Until the stock prices goes down and down and down ... and I keep averaging down. Thinking it's a good fundamental stock and it will go up eventually. Until I began to see "Why IHSG rally more than 20% meanwhile my portfolio is negative?" and someone on social media said "Even monkey can gain profit in this market". So, I was dumber than monkey? (maybe yes). So I joined the IDX late-stage rally. Betting on crowded and rumour stocks at ATH with no discipline, borrowed conviction, and no market understanding. There goes the MSCI freeze and the rest is history.

In short, it's an expensive lesson. What should I do? learn, build post-mortem, create a system, and follow it. Research and analyze properly. However, as we are in the Agentic AI era, instead of doing everything manually, can we utilize LLMs in our process? Two birds in one stone; learning and doing investment process effectively and testing the limit of Agentic AI. Hence the naming, Vibe Investing (similar to Vibe Coding, but for investment).

There are several fundamental ideas with this AI:

- Agentic AI means giving the AI a set of problem, prompt, and tools and let it perform autonomous action to achieve the goal or solve the problem.
- That being said, benchmarks shows that doing investing with AI is no better than coin flip. Remember the LLMs trading experiment? (todo find the link). In short, it's not an ideal solution. Instead of relying on LLM knowledge, can we supply the AI with the relevant knowledge? (almost) exactly the same if a real human doing the analysis. All the information stream. Then, instead of relying at the mercy of the LLM, we prepare a set of workflow, rules, prompt that replicates how a human usually do analysis and make the AI do it.
- LLM is a smart goldfish. So we need a memory system, just like how human write down notes. but this system requires both human and LLM can collaborate together in a way that understood by both and optimized for LLM as well. Lucikly, I'm a programemr so I live in VS Code and take notes in markdown file. LLMs is goot ad CLI and filesystem operations. Just give it a folder/workspace to work on and some foldering structure and there you go.

todo breakdown human workflow? breakdown idea?

---

below is the AI slop.

## The Idea

- Why build an AI investment analyst for IDX
- The Stock Market 2.0 reality: price driven by narratives, flow, and informed players — not just fundamentals
- What I wanted: an AI that can gather evidence, track theses, monitor 20+ symbols, and help me make better decisions

## The Tooling

- Custom MCP servers for stock data, broker flow, knowledge base, and document retrieval
- Browser automation for capturing portfolio state and trade history from Stockbit
- Exa for web search and news coverage
- How the tools compose into a working data layer the AI can query

## The Data Pipeline

- OHLCV with split-adjusted pricing, daily + intraday
- Broker flow data: 60-day windows, deterministic preprocessing into flow context
- Document ingestion: filings, news, analysis, rumors — each as distinct evidence classes
- Knowledge service with Qdrant vector storage for semantic search across thousands of documents

## The Memory Design

- Symbol plans as durable operating state
- Thesis files with frontmatter contracts
- Market-level artifacts (IHSG plan, desk check summaries)
- Run logs for workflow continuity
- Opportunity cost ledger and decision quality tracker
- Why memory architecture matters more than prompt engineering

## The Skill Design

- Four analytical lenses: narrative, technical, flow, fundamental
- Each skill owns its rubric, data sources, deterministic preprocessing, and scoring contract
- Narrative: thesis identification, catalyst mapping, backbone scoring (0-15)
- Technical: Wyckoff, VPVR, structure events via Python scripts → agent interpretation
- Flow: broker flow context builder → signal clarity and trust scoring
- Fundamental: multi-mode analysis (full review, quality check, valuation, filing review, ownership)
- Portfolio management: constraint math, hard rails, regime aggression

## The Evaluation: 80+ Sessions and the BUMI Case Study

- The stock that exposed everything: BUMI went 136→484 (+256%), AI WAITed through the entire move
- Only entered at 242 after I pushed twice, with a trivially small position
- Exit at 452 before a -43% crash was excellent
- The pattern: decisive on exits, paralyzed on entries

## Where LLMs Break Down

- Entry decisions are inherently ambiguous — that's why the opportunity exists
- The system converted judgment into scores, averaged them, and checked thresholds
- Conflicting signals → middling scores → inaction
- The AI couldn't distinguish noise from signal in context (coal earnings miss vs gold thesis)
- Band-aids accumulated: WAIT ladders, weight rebalancing, "don't default to inaction"

## The Redesign

- AI as research analyst and risk manager, not portfolio manager
- Thesis-first: define the thesis, filter all signals through thesis relevance
- Lens roles: narrative anchors, TA informs timing, flow informs sizing, fundamental validates
- Triage: most symbols get a one-liner, only material changes get full reviews
- Human decides entries, AI executes and monitors
- Scores become diagnostics, not decisions

## Lessons for AI Agent Design

- Know what your AI is good at and design around that
- Don't ask LLMs to resolve ambiguity — they'll hedge
- Separate evidence gathering from judgment
- Memory and tooling matter more than prompt tricks
- The best AI assistant knows when to hand the decision back to the human
