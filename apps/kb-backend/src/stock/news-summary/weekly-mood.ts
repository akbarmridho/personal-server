import dayjs from "dayjs";
import { KV } from "../../db/kv.js";

export interface WeeklyMoodData {
  date: string;
  content: string;
}

export const getWeeklyMoodData = async (
  count: number,
): Promise<WeeklyMoodData[]> => {
  const result = await KV.get(`weekly-mood`);

  if (!result) {
    throw new Error("Weekly mood should not be empty");
  }

  const data = result as any as WeeklyMoodData[];

  return data
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
    .slice(0, count);
};

export const mergeWeeklyMoodData = async (
  newData: WeeklyMoodData[],
): Promise<void> => {
  const existing = (await KV.get(`weekly-mood`)) || [];
  const existingData = existing as any as WeeklyMoodData[];

  const dataMap = new Map(existingData.map((d) => [d.date, d]));
  newData.forEach((d) => {
    dataMap.set(d.date, d);
  });

  const merged = Array.from(dataMap.values()).sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf(),
  );

  await KV.set(`weekly-mood`, merged as any);
};
