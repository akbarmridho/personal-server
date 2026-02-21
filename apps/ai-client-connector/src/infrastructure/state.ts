import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

type AppState = {
  goldenArticleLastSuccessAt?: string;
  generalNewsProxyQueueFlushLastSuccessAt?: string;
  whatsappChannelLastSuccessAt?: string;
};

export async function getGoldenArticleLastSuccessAt(): Promise<
  string | undefined
> {
  const state = await readState();
  return state.goldenArticleLastSuccessAt;
}

export async function setGoldenArticleLastSuccessAt(
  value: string,
): Promise<void> {
  const state = await readState();

  await writeState({
    ...state,
    goldenArticleLastSuccessAt: value,
  });
}

export async function getGeneralNewsProxyQueueFlushLastSuccessAt(): Promise<
  string | undefined
> {
  const state = await readState();
  return state.generalNewsProxyQueueFlushLastSuccessAt;
}

export async function setGeneralNewsProxyQueueFlushLastSuccessAt(
  value: string,
): Promise<void> {
  const state = await readState();

  await writeState({
    ...state,
    generalNewsProxyQueueFlushLastSuccessAt: value,
  });
}

export async function getWhatsAppChannelLastSuccessAt(): Promise<
  string | undefined
> {
  const state = await readState();
  return state.whatsappChannelLastSuccessAt;
}

export async function setWhatsAppChannelLastSuccessAt(
  value: string,
): Promise<void> {
  const state = await readState();

  await writeState({
    ...state,
    whatsappChannelLastSuccessAt: value,
  });
}

async function readState(): Promise<AppState> {
  try {
    const raw = await readFile(env.STATE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return {};
    }

    logger.warn(
      { err: error, statePath: env.STATE_FILE_PATH },
      "Failed to read state file, continuing with empty state",
    );
    return {};
  }
}

async function writeState(state: AppState): Promise<void> {
  const stateDir = path.dirname(env.STATE_FILE_PATH);
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    env.STATE_FILE_PATH,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
