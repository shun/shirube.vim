import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";

export type UiMode = "float" | "buffer";

export type Config = {
  skipConfirm: boolean;
  uiMode: UiMode;
};

const defaultConfig: Config = {
  skipConfirm: false,
  uiMode: "float",
};

const parseBool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return fallback;
};

const parseUiMode = (value: unknown, fallback: UiMode): UiMode => {
  if (value === "float" || value === "buffer") {
    return value;
  }
  return fallback;
};

const normalizeConfig = (value: unknown): Config => {
  const raw = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  return {
    skipConfirm: parseBool(raw.skip_confirm, defaultConfig.skipConfirm),
    uiMode: parseUiMode(raw.ui_mode, defaultConfig.uiMode),
  };
};

export const loadConfig = async (denops: Denops): Promise<Config> => {
  const raw = await denops.eval("get(g:, 'shirube', {})");
  return normalizeConfig(raw);
};
