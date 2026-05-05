import { describe, expect, it } from "vitest";
import { parseKeyValuePairs, parseMeasureInput } from "../src/utils/measure-parser.js";

describe("parseKeyValuePairs", () => {
  it("parses simple key:value pairs", () => {
    const result = parseKeyValuePairs("w:72.5 f:18.5");
    expect(result).toEqual({ w: "72.5", f: "18.5" });
  });

  it("parses keys with underscores", () => {
    const result = parseKeyValuePairs("body_fat_pct:20 smm:30");
    expect(result).toEqual({ body_fat_pct: "20", smm: "30" });
  });

  it("lowercases keys", () => {
    const result = parseKeyValuePairs("W:70 F:15");
    expect(result).toEqual({ w: "70", f: "15" });
  });

  it("parses notes with spaces", () => {
    const result = parseKeyValuePairs("w:70 notes:feeling good today");
    expect(result).toEqual({ w: "70", notes: "feeling good today" });
  });

  it("returns empty object for no pairs", () => {
    const result = parseKeyValuePairs("hello world");
    expect(result).toEqual({});
  });
});

describe("parseMeasureInput", () => {
  const today = "2026-05-05";

  it("parses weight only → defaults date to today", () => {
    const result = parseMeasureInput("w:72.5", today);
    expect(result).toEqual({
      ok: true,
      data: { weight: 72.5, date: today },
    });
  });

  it("parses all fields with aliases", () => {
    const result = parseMeasureInput(
      "w:72.5 f:18.5 bfm:15 smm:33.2 vf:10 bmr:1500 tbw:40 bmi:24 ffm:60 smi:8.5 notes:post-workout",
      today,
    );
    expect(result).toEqual({
      ok: true,
      data: {
        weight: 72.5,
        date: today,
        bodyFatPct: 18.5,
        bodyFatMass: 15,
        skeletalMuscleMass: 33.2,
        visceralFatLevel: 10,
        bmr: 1500,
        totalBodyWater: 40,
        bmi: 24,
        fatFreeMass: 60,
        smi: 8.5,
        notes: "post-workout",
      },
    });
  });

  it("parses date override", () => {
    const result = parseMeasureInput("w:70 date:2025-12-25", today);
    expect(result).toEqual({
      ok: true,
      data: { weight: 70, date: "2025-12-25" },
    });
  });

  it("rejects missing weight", () => {
    const result = parseMeasureInput("f:18.5", today);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "Weight is required",
    );
  });

  it("rejects invalid weight", () => {
    const result = parseMeasureInput("w:abc", today);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "Invalid weight",
    );
  });

  it("rejects zero weight", () => {
    const result = parseMeasureInput("w:0", today);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "Invalid weight",
    );
  });

  it("rejects invalid date format", () => {
    const result = parseMeasureInput("w:70 date:25-12-2025", today);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "Invalid date format",
    );
  });

  it("rejects no key:value pairs", () => {
    const result = parseMeasureInput("hello world", today);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "No key:value pairs",
    );
  });

  it("rounds integer fields (vf, bmr)", () => {
    const result = parseMeasureInput("w:70 vf:10.9 bmr:1499.1", today);
    expect(result).toEqual({
      ok: true,
      data: { weight: 70, date: today, visceralFatLevel: 11, bmr: 1499 },
    });
  });

  it("ignores unknown keys silently", () => {
    const result = parseMeasureInput("w:70 foo:bar baz:123", today);
    expect(result).toEqual({
      ok: true,
      data: { weight: 70, date: today },
    });
  });

  it("ignores empty values", () => {
    const result = parseMeasureInput("w:70 f:", today);
    expect(result).toEqual({
      ok: true,
      data: { weight: 70, date: today },
    });
  });
});
