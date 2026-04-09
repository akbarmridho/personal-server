---
title: 'Vibe Investing AI: Lesson Learned building AI Agent that Became No-as-a-Service'
description: 'Building an AI-powered investment analyst for the Indonesian stock market — from data pipelines and custom tooling to memory architecture, skill design, and what 80+ sessions taught me about where LLMs actually break down.'
pubDate: 2026-04-09
author: 'Akbar Maulana Ridho'
tags: ['agentic-ai', 'idx', 'investing']
---

*Outline — full post coming soon.*

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
