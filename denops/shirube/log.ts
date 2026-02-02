import { dirname, join } from "@std/path";
import type { Config } from "./config.ts";

export type Logger = {
  debug: (message: string, data?: Record<string, unknown>) => Promise<void>;
  error: (message: string, data?: Record<string, unknown>) => Promise<void>;
};

const noop = async (
  _message: string,
  _data?: Record<string, unknown>,
): Promise<void> => {};

const ensureDir = async (path: string): Promise<void> => {
  const dir = dirname(path);
  if (!dir || dir === ".") {
    return;
  }
  await Deno.mkdir(dir, { recursive: true });
};

const resolveLogFile = async (value: string): Promise<string> => {
  if (value.endsWith("/") || value.endsWith("\\")) {
    return join(value, "shirube.log");
  }
  try {
    const stat = await Deno.stat(value);
    if (stat.isDirectory) {
      return join(value, "shirube.log");
    }
  } catch {
    // Ignore lookup errors and treat as a file path.
  }
  return value;
};

const formatEntry = (
  level: "debug" | "error",
  message: string,
  data?: Record<string, unknown>,
): string => {
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    message,
  };
  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }
  return JSON.stringify(entry);
};

export const createLogger = (config: Config): Logger => {
  const logFile = config.logFile.trim();
  if (!logFile) {
    return { debug: noop, error: noop };
  }
  let prepared = false;
  let resolvedPath: string | null = null;
  const write = async (
    level: "debug" | "error",
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> => {
    try {
      if (!prepared) {
        resolvedPath = await resolveLogFile(logFile);
        await ensureDir(resolvedPath);
        prepared = true;
      }
      const target = resolvedPath ?? logFile;
      const line = formatEntry(level, message, data);
      await Deno.writeTextFile(target, `${line}\n`, { append: true });
    } catch (error) {
      console.error("shirube log failed", error);
    }
  };
  return {
    debug: (message, data) => write("debug", message, data),
    error: (message, data) => write("error", message, data),
  };
};
