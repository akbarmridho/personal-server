import { brokerAnalysis } from "./catalog/broker-analysis.js";
import { fundamentalAnalysisNarrative } from "./catalog/fundamental-analysis-narrative.js";
import { gcOversoldPlaybook } from "./catalog/gc-oversold-playbook.js";
import { sectorBanking } from "./catalog/sector-banking.js";
import { sectorCoal } from "./catalog/sector-coal.js";
import { sectorOilGas } from "./catalog/sector-oil-gas.js";
import { sectorShariaBanking } from "./catalog/sector-sharia-banking.js";
import type { Skill } from "./types.js";

const skills: Skill[] = [
  brokerAnalysis,
  gcOversoldPlaybook,
  fundamentalAnalysisNarrative,
  sectorCoal,
  sectorOilGas,
  sectorBanking,
  sectorShariaBanking,
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
