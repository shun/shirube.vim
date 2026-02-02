import { normalize, resolve } from "@std/path";
import type { BufferState, EntryId } from "../types.ts";
import { urlToPath } from "../util.ts";

export type ParsedCreate = {
  path: string;
  entryType: "file" | "directory";
};

export type ParseResult = {
  existing: Map<EntryId, string>;
  created: ParsedCreate[];
  duplicated: Map<EntryId, string[]>;
  errors: string[];
};

const resolvePath = (basePath: string, name: string): string => {
  return normalize(resolve(basePath, name));
};

const stripTrailingSlash = (value: string): string => {
  return value.replace(/\/+$/, "");
};

export const parseBuffer = (
  lines: string[],
  state: BufferState,
): ParseResult => {
  const basePath = urlToPath(state.url);
  const existing = new Map<EntryId, string>();
  const created: ParsedCreate[] = [];
  const duplicated = new Map<EntryId, string[]>();
  const errors: string[] = [];
  const seenPaths = new Set<string>();
  const seenIds = new Set<EntryId>();

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    const matched = line.match(/^\/(\d+) (.*)$/);
    if (matched) {
      const id = Number(matched[1]);
      const name = stripTrailingSlash(matched[2]);
      if (name.trim().length === 0) {
        errors.push(`empty name for id: ${id}`);
        continue;
      }
      if (!Number.isInteger(id)) {
        errors.push(`invalid id: ${matched[1]}`);
        continue;
      }
      if (!state.entries.has(id)) {
        errors.push(`unknown id: ${id}`);
        continue;
      }
      const path = resolvePath(basePath, name);
      if (seenPaths.has(path)) {
        errors.push(`duplicate path: ${path}`);
        continue;
      }
      seenPaths.add(path);
      if (seenIds.has(id)) {
        const dups = duplicated.get(id) ?? [];
        dups.push(path);
        duplicated.set(id, dups);
      } else {
        seenIds.add(id);
        existing.set(id, path);
      }
      continue;
    }
    const isDirectory = line.endsWith("/");
    const name = isDirectory ? line.slice(0, -1) : line;
    if (name.trim().length === 0) {
      errors.push("empty name for create");
      continue;
    }
    const path = resolvePath(basePath, name);
    if (seenPaths.has(path)) {
      errors.push(`duplicate path: ${path}`);
      continue;
    }
    seenPaths.add(path);
    created.push({ path, entryType: isDirectory ? "directory" : "file" });
  }

  return { existing, created, duplicated, errors };
};
