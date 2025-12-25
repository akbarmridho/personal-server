import { bottomFishingPlaybook } from "./catalog/bottom-fishing-playbook.js";
import { brokerAnalysis } from "./catalog/broker-analysis.js";
import { economicCycleRotation } from "./catalog/economic-cycle-rotation.js";
import { economicMoat } from "./catalog/economic-moat.js";
import { financiaStatementlHealthCheck } from "./catalog/financial-statement-healthcheck.js";
import { foreignFlowMechanics } from "./catalog/foreign-flow-mechanics.js";
import { fundamentalAnalysisNarrative } from "./catalog/fundamental-analysis-narrative.js";
import { gcOversoldPlaybook } from "./catalog/gc-oversold-playbook.js";
import { indonesianConglomerates } from "./catalog/indonesian-conglomerates.js";
import { ipoAnalysis } from "./catalog/ipo-analysis.js";
import { portfolioManagement } from "./catalog/portfolio-management.js";
import { sectorBanking } from "./catalog/sector-banking.js";
import { sectorCoal } from "./catalog/sector-coal.js";
import { sectorConstruction } from "./catalog/sector-construction.js";
import { sectorOilGas } from "./catalog/sector-oil-gas.js";
import { sectorProperty } from "./catalog/sector-property.js";
import { sectorRetailConsumer } from "./catalog/sector-retail-consumer.js";
import { sectorShariaBanking } from "./catalog/sector-sharia-banking.js";
import { valuationMethodology } from "./catalog/valuation-methodology.js";
import { valueTrapIdentification } from "./catalog/value-trap-identification.js";
import type { Skill } from "./types.js";

const skills: Skill[] = [
  // Reality & Fundamentals
  foreignFlowMechanics,
  brokerAnalysis,
  indonesianConglomerates,

  // Strategy & Management
  economicCycleRotation,
  portfolioManagement,
  economicMoat,

  // Analysis Frameworks
  valuationMethodology,
  valueTrapIdentification,
  financiaStatementlHealthCheck,
  fundamentalAnalysisNarrative,
  ipoAnalysis,

  // Technical Playbooks
  gcOversoldPlaybook,
  bottomFishingPlaybook,

  // Sector Specific
  sectorCoal,
  sectorOilGas,
  sectorBanking,
  sectorShariaBanking,
  sectorRetailConsumer,
  sectorProperty,
  sectorConstruction,
];

export const listSkills = () => {
  return skills.map((e) => ({
    name: e.name,
    description: e.description,
  }));
};

export const getSkill = (name: string): Skill | null => {
  return skills.find((e) => e.name === name) || null;
};
