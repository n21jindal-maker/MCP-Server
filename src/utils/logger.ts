type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Patterns that look like OAuth tokens or secrets — redact them
const SENSITIVE_PATTERNS = [
  /ya29\.[A-Za-z0-9_-]+/g, // Google access tokens
  /1\/[A-Za-z0-9_-]{20,}/g, // Google refresh tokens
  /AIza[A-Za-z0-9_-]{35}/g, // Google API keys
];

function redact(message: string): string {
  let redacted = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(
    level: string,
    tool: string,
    event: string,
    extra?: Record<string, unknown>
  ): string {
    const parts = [
      `${formatTimestamp()}`,
      `${level.toUpperCase().padEnd(5)}`,
      `[${tool}]`,
      event,
    ];

    if (extra) {
      const extraStr = Object.entries(extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      if (extraStr) {
        parts.push(extraStr);
      }
    }

    return redact(parts.join(" "));
  }

  debug(tool: string, event: string, extra?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.error(this.formatMessage("debug", tool, event, extra));
    }
  }

  info(tool: string, event: string, extra?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.error(this.formatMessage("info", tool, event, extra));
    }
  }

  warn(tool: string, event: string, extra?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.error(this.formatMessage("warn", tool, event, extra));
    }
  }

  error(tool: string, event: string, extra?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", tool, event, extra));
    }
  }
}

// Singleton logger instance
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || "info"
);
