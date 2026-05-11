export interface ParsedMeasurement {
  weight: number;
  date: string;
  bodyFatPct?: number;
  bodyFatMass?: number;
  skeletalMuscleMass?: number;
  visceralFatLevel?: number;
  bmr?: number;
  totalBodyWater?: number;
  bmi?: number;
  fatFreeMass?: number;
  boneMass?: number;
  smi?: number;
  notes?: string;
}

export type ParseResult =
  | { ok: true; data: ParsedMeasurement }
  | { ok: false; reason: string };

export function parseKeyValuePairs(text: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const regex = /(\w+):([^\s]+(?:\s+(?!\w+:)[^\s]+)*)/g;
  let m: RegExpExecArray | null = regex.exec(text);
  while (m !== null) {
    pairs[m[1].toLowerCase()] = m[2].trim();
    m = regex.exec(text);
  }
  return pairs;
}

export function parseMeasureInput(text: string, today: string): ParseResult {
  const pairs = parseKeyValuePairs(text);
  if (Object.keys(pairs).length === 0) {
    return { ok: false, reason: "No key:value pairs found" };
  }

  // Resolve weight (required)
  const rawWeight = pairs.w ?? pairs.weight;
  if (!rawWeight) {
    return { ok: false, reason: "Weight is required. Use w:72.5" };
  }

  const weight = Number(rawWeight);
  if (Number.isNaN(weight) || weight <= 0) {
    return { ok: false, reason: "Invalid weight. Must be a positive number." };
  }

  // Resolve date
  let dateStr = pairs.date;
  if (dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { ok: false, reason: "Invalid date format. Use date:YYYY-MM-DD" };
    }
  } else {
    dateStr = today;
  }

  const data: ParsedMeasurement = { weight, date: dateStr };

  const setIfNumber = (
    key: string,
    target: keyof ParsedMeasurement,
    opts?: { int?: boolean },
  ) => {
    const raw = Object.entries(pairs).find(
      ([k]) => k.toLowerCase() === key.toLowerCase(),
    )?.[1];
    if (raw === undefined || raw === "") return;
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    (data as unknown as Record<string, unknown>)[target] = opts?.int
      ? Math.round(n)
      : n;
  };

  setIfNumber("f", "bodyFatPct");
  setIfNumber("bf", "bodyFatPct");
  setIfNumber("body_fat_pct", "bodyFatPct");
  setIfNumber("bfm", "bodyFatMass");
  setIfNumber("body_fat_mass", "bodyFatMass");
  setIfNumber("smm", "skeletalMuscleMass");
  setIfNumber("skeletal_muscle_mass", "skeletalMuscleMass");
  setIfNumber("vf", "visceralFatLevel", { int: true });
  setIfNumber("visceral_fat", "visceralFatLevel", { int: true });
  setIfNumber("bmr", "bmr", { int: true });
  setIfNumber("tbw", "totalBodyWater");
  setIfNumber("total_body_water", "totalBodyWater");
  setIfNumber("bmi", "bmi");
  setIfNumber("ffm", "fatFreeMass");
  setIfNumber("fat_free_mass", "fatFreeMass");
  setIfNumber("bm", "boneMass");
  setIfNumber("mineral", "boneMass");
  setIfNumber("bone_mass", "boneMass");
  setIfNumber("smi", "smi");

  const rawNotes = pairs.notes ?? pairs.note;
  if (rawNotes) {
    data.notes = rawNotes;
  }

  return { ok: true, data };
}
