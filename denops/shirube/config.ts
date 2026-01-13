import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";

export type UiMode = "float" | "buffer";

export type KeymapAction = "open_cursor" | "open_parent";
export type Keymaps = Record<string, KeymapAction>;
export type GlobalKeymapAction = "open_shirube";
export type GlobalKeymaps = Record<string, GlobalKeymapAction>;

export type Config = {
  skipConfirm: boolean;
  uiMode: UiMode;
  keymaps: Keymaps;
  keymapsGlobal: GlobalKeymaps;
  logFile: string;
};

const defaultConfig: Config = {
  skipConfirm: false,
  uiMode: "float",
  keymaps: {},
  keymapsGlobal: {},
  logFile: "",
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

const parseString = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
};

const parseUiMode = (value: unknown, fallback: UiMode): UiMode => {
  if (value === "float" || value === "buffer") {
    return value;
  }
  return fallback;
};

const isKeymapAction = (value: unknown): value is KeymapAction => {
  return value === "open_cursor" || value === "open_parent";
};

const isGlobalKeymapAction = (
  value: unknown,
): value is GlobalKeymapAction => {
  return value === "open_shirube";
};

const parseKeymaps = (value: unknown): Keymaps => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const keymaps: Keymaps = {};
  for (const [key, action] of Object.entries(raw)) {
    if (key.length === 0 || !isKeymapAction(action)) {
      continue;
    }
    keymaps[key] = action;
  }
  return keymaps;
};

const parseGlobalKeymaps = (value: unknown): GlobalKeymaps => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const keymaps: GlobalKeymaps = {};
  for (const [key, action] of Object.entries(raw)) {
    if (key.length === 0 || !isGlobalKeymapAction(action)) {
      continue;
    }
    keymaps[key] = action;
  }
  return keymaps;
};

const normalizeConfig = (value: unknown): Config => {
  const raw = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const hasKeymaps = Object.prototype.hasOwnProperty.call(raw, "keymaps");
  const keymaps = hasKeymaps ? parseKeymaps(raw.keymaps) : {};
  if (!hasKeymaps) {
    if (parseBool(raw.keymap_enter, false)) {
      keymaps["<CR>"] = "open_cursor";
    }
    if (parseBool(raw.keymap_parent, false)) {
      keymaps["-"] = "open_parent";
    }
  }
  const keymapsGlobal = parseGlobalKeymaps(raw.keymaps_global);
  return {
    skipConfirm: parseBool(raw.skip_confirm, defaultConfig.skipConfirm),
    uiMode: parseUiMode(raw.ui_mode, defaultConfig.uiMode),
    keymaps,
    keymapsGlobal,
    logFile: parseString(raw.log_file, defaultConfig.logFile),
  };
};

export const loadConfig = async (denops: Denops): Promise<Config> => {
  const raw = await denops.eval("get(g:, 'shirube', {})");
  return normalizeConfig(raw);
};
