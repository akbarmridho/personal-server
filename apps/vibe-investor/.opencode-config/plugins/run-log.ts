import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

type FileDiff = {
  file: string;
};

type PendingCommand = {
  command: string;
  arguments: string;
  messageID: string;
};

type RunLogPayload = {
  workflow: string;
  completed_at: string;
  window_from: string;
  window_to: string;
  symbols: string[];
  artifacts: string[];
};

const WORKFLOW_LOOKBACK_DAYS: Record<string, number> = {
  "desk-check": 1,
  "deep-review": 30,
  "explore-idea": 30,
  "news-digest": 7,
  "digest-sync": 7,
  ta: 1,
};

const pendingCommands = new Map<string, PendingCommand>();
const writingSessions = new Set<string>();

export const RunLogPlugin: Plugin = async ({ client, directory }) => {
  return {
    async event({ event }) {
      if (event.type === "command.executed") {
        if (!(event.properties.name in WORKFLOW_LOOKBACK_DAYS)) {
          return;
        }

        pendingCommands.set(event.properties.sessionID, {
          command: event.properties.name,
          arguments: event.properties.arguments,
          messageID: event.properties.messageID,
        });
        return;
      }

      if (event.type === "session.error") {
        if (event.properties.sessionID) {
          pendingCommands.delete(event.properties.sessionID);
        }
        return;
      }

      if (event.type !== "session.idle") {
        return;
      }

      const sessionID = event.properties.sessionID;
      const pendingCommand = pendingCommands.get(sessionID);
      if (!pendingCommand || writingSessions.has(sessionID)) {
        return;
      }

      writingSessions.add(sessionID);
      try {
        const diffResult = await client.session.diff({
          path: { id: sessionID },
          query: {
            directory,
            messageID: pendingCommand.messageID,
          },
        });
        const fileDiffs = diffResult.data ?? [];
        const artifacts = collectArtifacts(fileDiffs);
        const knownSymbols = await listKnownSymbols(directory);
        const symbols = await collectSymbols(
          pendingCommand.arguments,
          artifacts,
          knownSymbols,
          directory,
        );
        const { windowFrom, windowTo } = await resolveRunWindow(
          directory,
          pendingCommand.command,
          pendingCommand.arguments,
        );
        const completedAt = formatJakartaTimestamp(new Date());
        const runLogPath = path.resolve(
          directory,
          "memory",
          "runs",
          windowTo,
          `${completedAt.slice(11, 13)}${completedAt.slice(14, 16)}${completedAt.slice(17, 19)}_${pendingCommand.command}.json`,
        );
        const payload: RunLogPayload = {
          workflow: pendingCommand.command,
          completed_at: completedAt,
          window_from: windowFrom,
          window_to: windowTo,
          symbols,
          artifacts,
        };

        await mkdir(path.dirname(runLogPath), { recursive: true });
        await writeFile(runLogPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      } finally {
        pendingCommands.delete(sessionID);
        writingSessions.delete(sessionID);
      }
    },
  };
};

function collectArtifacts(fileDiffs: FileDiff[]): string[] {
  return [
    ...new Set(
      fileDiffs
        .map((fileDiff) => toMemoryPath(fileDiff.file))
        .filter(
          (filePath) =>
            filePath.startsWith("memory/") &&
            !filePath.startsWith("memory/runs/"),
        ),
    ),
  ].sort();
}

async function collectSymbols(
  commandArguments: string,
  artifacts: string[],
  knownSymbols: Set<string>,
  directory: string,
): Promise<string[]> {
  const symbols = new Set<string>();

  for (const symbol of extractSymbolsFromText(commandArguments, knownSymbols)) {
    symbols.add(symbol);
  }

  for (const artifact of artifacts) {
    const symbolMatch = artifact.match(/^memory\/symbols\/([A-Z0-9-]+)\//);
    if (symbolMatch && knownSymbols.has(symbolMatch[1])) {
      symbols.add(symbolMatch[1]);
      continue;
    }

    if (artifact.endsWith(".md") || artifact.endsWith(".json")) {
      try {
        const raw = await readFile(path.resolve(directory, artifact), "utf8");
        for (const symbol of extractSymbolsFromText(raw, knownSymbols)) {
          symbols.add(symbol);
        }
      } catch {
        continue;
      }
    }
  }

  return [...symbols].sort();
}

function extractSymbolsFromText(raw: string, knownSymbols: Set<string>): string[] {
  return [...new Set(raw.match(/\b[A-Z][A-Z0-9-]{1,14}\b/g) ?? [])].filter(
    (token) => knownSymbols.has(token),
  );
}

async function resolveRunWindow(
  directory: string,
  workflow: string,
  commandArguments: string,
): Promise<{ windowFrom: string; windowTo: string }> {
  const explicitDates = commandArguments.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (explicitDates.length >= 2) {
    return {
      windowFrom: explicitDates[0]!,
      windowTo: explicitDates.at(-1)!,
    };
  }
  if (explicitDates.length === 1) {
    return {
      windowFrom: explicitDates[0]!,
      windowTo: explicitDates[0]!,
    };
  }

  const continuityWorkflow =
    workflow === "digest-sync" ? "news-digest" : workflow;
  const latestRunLog = await readLatestRunLog(directory, continuityWorkflow);
  const tradingDay = resolveTradingDayJakarta(new Date());

  if (
    workflow === "digest-sync" &&
    latestRunLog?.window_from &&
    latestRunLog.window_to
  ) {
    return {
      windowFrom: latestRunLog.window_from,
      windowTo: latestRunLog.window_to,
    };
  }

  if (latestRunLog?.window_to) {
    return {
      windowFrom:
        latestRunLog.window_to === tradingDay
          ? tradingDay
          : latestRunLog.window_to,
      windowTo: tradingDay,
    };
  }

  return {
    windowFrom: shiftDate(tradingDay, -(WORKFLOW_LOOKBACK_DAYS[workflow] ?? 1)),
    windowTo: tradingDay,
  };
}

async function readLatestRunLog(
  directory: string,
  workflow: string,
): Promise<RunLogPayload | null> {
  const runsRoot = path.resolve(directory, "memory", "runs");
  try {
    const dateEntries = await readdir(runsRoot, { withFileTypes: true });
    const candidates = (
      await Promise.all(
        dateEntries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const datePath = path.resolve(runsRoot, entry.name);
            const runFiles = await readdir(datePath, { withFileTypes: true });
            return runFiles
              .filter(
                (file) =>
                  file.isFile() &&
                  file.name.endsWith(`_${workflow}.json`),
              )
              .map((file) => path.resolve(datePath, file.name));
          }),
      )
    )
      .flat()
      .sort();
    const latest = candidates.at(-1);
    if (!latest) {
      return null;
    }

    return JSON.parse(await readFile(latest, "utf8")) as RunLogPayload;
  } catch {
    return null;
  }
}

async function listKnownSymbols(directory: string): Promise<Set<string>> {
  try {
    const entries = await readdir(path.resolve(directory, "memory", "symbols"), {
      withFileTypes: true,
    });
    return new Set(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name.toUpperCase()),
    );
  } catch {
    return new Set();
  }
}

function resolveTradingDayJakarta(now: Date): string {
  const parts = jakartaDateParts(now);
  let tradingDay = `${parts.year}-${parts.month}-${parts.day}`;

  if (parts.hour < 9) {
    tradingDay = shiftDate(tradingDay, -1);
  }

  while (isWeekend(tradingDay)) {
    tradingDay = shiftDate(tradingDay, -1);
  }

  return tradingDay;
}

function formatJakartaTimestamp(date: Date): string {
  const parts = jakartaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hourText}:${parts.minute}:${parts.second}+0700`;
}

function jakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: mapped.year ?? "1970",
    month: mapped.month ?? "01",
    day: mapped.day ?? "01",
    hour: Number(mapped.hour ?? "0"),
    hourText: mapped.hour ?? "00",
    minute: mapped.minute ?? "00",
    second: mapped.second ?? "00",
  };
}

function shiftDate(dateText: string, deltaDays: number): string {
  const [year, month, day] = dateText.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function isWeekend(dateText: string): boolean {
  const [year, month, day] = dateText.split("-").map((value) => Number(value));
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function toMemoryPath(filePath: string): string {
  const normalized = filePath.replaceAll(path.sep, "/");
  const memoryIndex = normalized.indexOf("/memory/");
  if (memoryIndex >= 0) {
    return normalized.slice(memoryIndex + 1);
  }
  return normalized.startsWith("memory/") ? normalized : normalized;
}
