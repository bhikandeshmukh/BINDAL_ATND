// Simple logging utility

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, data || "");
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || "");
        break;
      case LogLevel.INFO:
        console.info(logMessage, data || "");
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.log(logMessage, data || "");
        }
        break;
    }

    // In production, you would send logs to a service like Sentry, LogRocket, etc.
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(data);
    }
  }

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export const logger = new Logger();
