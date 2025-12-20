import { brokerAnalysis } from "./catalog/broker-analysis.js";
import type { Skill } from "./types.js";

const skills: Skill[] = [brokerAnalysis];

export const listSkills = () => {
  return skills.map((e) => ({
    name: e.name,
    description: e.description,
  }));
};

export const getSkill = (name: string): Skill | null => {
  return skills.find((e) => e.name === name) || null;
};
