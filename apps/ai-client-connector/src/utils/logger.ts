import pino from "pino";
import { env } from "../infrastructure/env.js";

const logLevel = env.LOG_LEVEL;

export const logger = pino({
  level: logLevel,
  serializers: {
    e: pino.stdSerializers.err,
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: logLevel,
        options: {
          colorize: true,
        },
      },
    ],
  },
});

logger.info(`Logger is active with level ${logLevel}`);
