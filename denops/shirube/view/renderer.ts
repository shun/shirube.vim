import type { Entry } from "../types.ts";

export type VirtTextChunk = [string, string];

export interface VirtText {
  line: number;
  chunks: VirtTextChunk[];
}

export interface RenderResult {
  lines: string[];
  virtTexts: VirtText[];
}

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

const formatIcon = (entry: Entry): string => {
  return entry.isDirectory ? "[d]" : "[f]";
};

const buildVirtText = (entry: Entry): VirtTextChunk[] => {
  return [
    [` ${formatIcon(entry)}`, "ShirubeIcon"],
    [` ${formatSize(entry)}`, "ShirubeMeta"],
    [` ${formatPermissions(entry)}`, "ShirubeMeta"],
  ];
};

const formatLine = (entry: Entry): string => {
  return `/${entry.id} ${entry.name}`;
};

export const renderEntries = (entries: Entry[]): RenderResult => {
  if (entries.length === 0) {
    return { lines: [""], virtTexts: [] };
  }
  return {
    lines: entries.map(formatLine),
    virtTexts: entries.map((entry, index) => ({
      line: index,
      chunks: buildVirtText(entry),
    })),
  };
};
