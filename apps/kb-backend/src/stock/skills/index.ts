import { brokerAnalysis } from "./catalog/broker-analysis.js";
import { fundamentalAnalysisNarrative } from "./catalog/fundamental-analysis-narrative.js";
import { gcOversoldPlaybook } from "./catalog/gc-oversold-playbook.js";
import type { Skill } from "./types.js";

const skills: Skill[] = [
  brokerAnalysis,
  gcOversoldPlaybook,
  fundamentalAnalysisNarrative,
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
