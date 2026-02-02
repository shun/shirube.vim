import type { Entry, MetaVisibility } from "../types.ts";

export type VirtTextChunk = [string, string];

export interface VirtText {
  line: number;
  chunks: VirtTextChunk[];
}

export interface RenderResult {
  lines: string[];
  virtTexts: VirtText[];
  highlights: {
    line: number;
    group: string;
  }[];
}

type MetaWidths = {
  size: number;
  permissions: number;
};

const formatSize = (entry: Entry): string => {
  if (entry.isDirectory) {
    return "-";
  }
  if (typeof entry.meta.size !== "number") {
    return "-";
  }
  return String(entry.meta.size);
};

const formatPermissions = (entry: Entry): string => {
  return entry.meta.permissions ?? "-";
};

const formatName = (entry: Entry): string => {
  if (!entry.isDirectory) {
    return entry.name;
  }
  return entry.name.endsWith("/") ? entry.name : `${entry.name}/`;
};

const padLeft = (value: string, width: number): string => {
  return value.padStart(width, " ");
};

const padRight = (value: string, width: number): string => {
  return value.padEnd(width, " ");
};

const calculateWidths = (
  entries: Entry[],
  meta: MetaVisibility,
): MetaWidths => {
  const widths: MetaWidths = { size: 1, permissions: 1 };
  for (const entry of entries) {
    if (meta.size) {
      widths.size = Math.max(widths.size, formatSize(entry).length);
    }
    if (meta.permissions) {
      widths.permissions = Math.max(
        widths.permissions,
        formatPermissions(entry).length,
      );
    }
  }
  return widths;
};

const buildVirtText = (
  entry: Entry,
  widths: MetaWidths,
  meta: MetaVisibility,
): VirtTextChunk[] => {
  const size = padLeft(formatSize(entry), widths.size);
  const permissions = padRight(formatPermissions(entry), widths.permissions);
  const chunks: VirtTextChunk[] = [];
  if (meta.size) {
    chunks.push([` ${size}`, "ShirubeMeta"]);
  }
  if (meta.permissions) {
    chunks.push([` ${permissions}`, "ShirubeMeta"]);
  }
  return chunks;
};

const formatLine = (entry: Entry): string => {
  return `/${entry.id} ${formatName(entry)}`;
};

export const renderEntries = (
  entries: Entry[],
  meta: MetaVisibility,
): RenderResult => {
  if (entries.length === 0) {
    return { lines: [""], virtTexts: [], highlights: [] };
  }
  const showMeta = meta.size || meta.permissions;
  const widths = showMeta ? calculateWidths(entries, meta) : {
    size: 1,
    permissions: 1,
  };
  const highlights = entries.flatMap((entry, index) => {
    if (entry.meta.error) {
      return [{ line: index, group: "ShirubeErrorLine" }];
    }
    return [];
  });
  return {
    lines: entries.map(formatLine),
    virtTexts: showMeta
      ? entries.map((entry, index) => ({
        line: index,
        chunks: buildVirtText(entry, widths, meta),
      }))
      : [],
    highlights,
  };
};
