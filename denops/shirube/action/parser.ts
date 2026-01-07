import { normalize, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import type { BufferState, EntryId } from "../types.ts";
import { urlToPath } from "../util.ts";

export type ParsedCreate = {
  path: string;
  entryType: "file" | "directory";
};

export type ParseResult = {
  existing: Map<EntryId, string>;
  created: ParsedCreate[];
  errors: string[];
};

const resolvePath = (basePath: string, name: string): string => {
  return normalize(resolve(basePath, name));
};

export const parseBuffer = (
  lines: string[],
  state: BufferState,
): ParseResult => {
  const basePath = urlToPath(state.url);
  const existing = new Map<EntryId, string>();
  const created: ParsedCreate[] = [];
  const errors: string[] = [];
  const seenPaths = new Set<string>();
  const seenIds = new Set<EntryId>();

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    const matched = line.match(/^\/(\d+)\s+(.*)$/);
    if (matched) {
      const id = Number(matched[1]);
      const name = matched[2];
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
      if (seenIds.has(id)) {
        errors.push(`duplicate id: ${id}`);
        continue;
      }
      const path = resolvePath(basePath, name);
      if (seenPaths.has(path)) {
        errors.push(`duplicate path: ${path}`);
        continue;
      }
      seenIds.add(id);
      seenPaths.add(path);
      existing.set(id, path);
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

  return { existing, created, errors };
};
