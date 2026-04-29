type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

class Logger {
  constructor(private readonly level: LogLevel) {}

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[this.level];
  }

  private emit(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level,
      message,
      ...(data === undefined ? {} : { data }),
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }
    console.log(line);
  }

  info(message: string, data?: unknown): void {
    this.emit("info", message, data);
  }
  warn(message: string, data?: unknown): void {
    this.emit("warn", message, data);
  }
  debug(message: string, data?: unknown): void {
    this.emit("debug", message, data);
  }
  error(message: string, data?: unknown): void {
    this.emit("error", message, data);
  }
}

function parseLogLevel(raw: string | undefined): LogLevel {
  const normalized = (raw ?? "info").toLowerCase();
  switch (normalized) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return normalized;
    default:
      return "info";
  }
}

export const logger = new Logger(parseLogLevel(Bun.env.LOG_LEVEL));
