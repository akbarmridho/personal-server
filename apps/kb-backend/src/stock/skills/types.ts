/**
 * Skill represents modular, reusable investment knowledge in the Vibe Investing app.
 *
 * Skills are bite-sized pieces of expertise that the AI can retrieve and apply when analyzing stocks.
 * They act as a knowledge base that extends the AI's capabilities beyond raw market data.
 *
 * Examples of skills:
 * - Broker information and fee structures
 * - Fundamental analysis calculation methods (P/E, PBV, ROE formulas)
 * - Technical analysis patterns and interpretations
 * - Trading strategies and playbooks (e.g., Golden Cross + Stochastic Oversold)
 * - Sector-specific valuation approaches
 * - Risk management frameworks
 *
 * Skills are exposed via MCP (Model Context Protocol) through:
 * - list-skills: Browse available skills
 * - get-skill: Retrieve specific skill content
 *
 * This allows the AI to dynamically load relevant expertise when needed,
 * keeping context windows efficient while maintaining deep domain knowledge.
 */
export interface Skill {
  /** Unique identifier for the skill (e.g., "broker-fees", "pe-ratio-calculation") */
  name: string;

  /** Brief explanation of what this skill provides (shown in list-skills) */
  description: string;

  /** The actual knowledge content in markdown format */
  content: string;
}
