import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";

export type ConfirmUiMode = "float" | "buffer";

export type KeymapAction =
  | "open_cursor"
  | "open_parent"
  | "close"
  | "toggle_size"
  | "toggle_permissions"
  | "reload";
export type Keymaps = Record<string, KeymapAction>;
export type GlobalKeymapAction = "open_shirube";
export type GlobalKeymaps = Record<string, GlobalKeymapAction>;
export type SortGroup = "none" | "directories-first" | "files-first";
export type SortConfig = {
  group: SortGroup;
};
export type MetaConfig = {
  size: boolean;
  permissions: boolean;
};

export type Config = {
  skipConfirm: boolean;
  confirmUiMode: ConfirmUiMode;
  keymaps: Keymaps;
  keymapsGlobal: GlobalKeymaps;
  sort: SortConfig;
  meta: MetaConfig;
  logFile: string;
};

const defaultSort: SortConfig = {
  group: "none",
};
const defaultMeta: MetaConfig = {
  size: false,
  permissions: false,
};

const defaultConfig: Config = {
  skipConfirm: false,
  confirmUiMode: "float",
  keymaps: {},
  keymapsGlobal: {},
  sort: defaultSort,
  meta: defaultMeta,
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

const parseConfirmUiMode = (
  value: unknown,
  fallback: ConfirmUiMode,
): ConfirmUiMode => {
  if (value === "float" || value === "buffer") {
    return value;
  }
  return fallback;
};

const parseSortGroup = (value: unknown, fallback: SortGroup): SortGroup => {
  if (
    value === "none" || value === "directories-first" || value === "files-first"
  ) {
    return value;
  }
  return fallback;
};

const isKeymapAction = (value: unknown): value is KeymapAction => {
  return value === "open_cursor" || value === "open_parent" ||
    value === "close" || value === "toggle_size" ||
    value === "toggle_permissions" || value === "reload";
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

const parseSort = (value: unknown): SortConfig => {
  if (!value || typeof value !== "object") {
    return defaultSort;
  }
  const raw = value as Record<string, unknown>;
  return {
    group: parseSortGroup(raw.group, defaultSort.group),
  };
};

const parseMeta = (value: unknown): MetaConfig => {
  if (!value || typeof value !== "object") {
    return defaultMeta;
  }
  const raw = value as Record<string, unknown>;
  return {
    size: parseBool(raw.size, defaultMeta.size),
    permissions: parseBool(raw.permissions, defaultMeta.permissions),
  };
};

const normalizeConfig = (value: unknown): Config => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const keymaps = parseKeymaps(raw.keymaps);
  const keymapsGlobal = parseGlobalKeymaps(raw.keymaps_global);
  const sort = parseSort(raw.sort);
  const meta = parseMeta(raw.meta);
  const confirmUiMode = parseConfirmUiMode(raw.confirm_ui_mode, defaultConfig.confirmUiMode);
  return {
    skipConfirm: parseBool(raw.skip_confirm, defaultConfig.skipConfirm),
    confirmUiMode,
    keymaps,
    keymapsGlobal,
    sort,
    meta,
    logFile: parseString(raw.log_file, defaultConfig.logFile),
  };
};

export const loadConfig = async (denops: Denops): Promise<Config> => {
  const raw = await denops.eval("get(g:, 'shirube', {})");
  return normalizeConfig(raw);
};
