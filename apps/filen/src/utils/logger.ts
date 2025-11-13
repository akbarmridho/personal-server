import "@dotenvx/dotenvx/config";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate timestamp for log filename
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(logsDir, `app-${timestamp}.log`);

const logLevel = (process.env.LOG_LEVEL || "info") as
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace";

export const logger = pino({
  level: logLevel,
  serializers: {
    err: pino.stdSerializers.err, // Serialize error objects
    error: pino.stdSerializers.err, // Serialize error objects
  },
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: logLevel,
        options: {
          colorize: process.stdout.isTTY, // Only colorize if TTY (interactive terminal)
        },
      },
      // {
      //   target: "pino/file",
      //   level: logLevel,
      //   options: {
      //     destination: logFile,
      //     colorize: false, // Ensure no ANSI color in file output
      //   },
      // },
    ],
  },
});

logger.info(`Logger is active with level ${logLevel} and logfile ${logFile}`);
