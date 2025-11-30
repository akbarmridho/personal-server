import pino from "pino";

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
    e: pino.stdSerializers.err, // Serialize error objects
    err: pino.stdSerializers.err, // Serialize error objects
    error: pino.stdSerializers.err, // Serialize error objects
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
