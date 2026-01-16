import type { Action, BufferState, Entry } from "../types.ts";
import type { ParseResult } from "./parser.ts";

export type DiffResult = {
  actions: Action[];
  errors: string[];
};

const entryTypeFromEntry = (entry: Entry): "file" | "directory" => {
  return entry.isDirectory ? "directory" : "file";
};

const sortWeight = (action: Action): number => {
  if (action.type === "create" && action.entryType === "directory") {
    return 0;
  }
  if (action.type === "move") {
    return 1;
  }
  if (action.type === "copy") {
    return 2;
  }
  if (action.type === "create") {
    return 3;
  }
  if (action.type === "delete" && action.entryType === "file") {
    return 4;
  }
  if (action.type === "delete" && action.entryType === "directory") {
    return 5;
  }
  return 9;
};

const sortActions = (actions: Action[]): Action[] => {
  return [...actions].sort((a, b) => sortWeight(a) - sortWeight(b));
};

export const buildActions = (
  state: BufferState,
  parsed: ParseResult,
): DiffResult => {
  const errors = [...parsed.errors];
  if (errors.length > 0) {
    return { actions: [], errors };
  }

  const actions: Action[] = [];
  for (const [id, dest] of parsed.existing) {
    const entry = state.entries.get(id);
    if (!entry) {
      errors.push(`unknown id: ${id}`);
      continue;
    }
    if (entry.path !== dest) {
      actions.push({
        type: "move",
        entryType: entryTypeFromEntry(entry),
        src: entry.path,
        dest,
      });
    }
  }

  for (const [id, dests] of parsed.duplicated) {
    const entry = state.entries.get(id);
    if (!entry) {
      errors.push(`unknown id: ${id}`);
      continue;
    }
    for (const dest of dests) {
      actions.push({
        type: "copy",
        entryType: entryTypeFromEntry(entry),
        src: entry.path,
        dest,
      });
    }
  }

  for (const create of parsed.created) {
    actions.push({
      type: "create",
      entryType: create.entryType,
      dest: create.path,
    });
  }

  for (const [id, entry] of state.entries) {
    if (!parsed.existing.has(id) && !parsed.duplicated.has(id)) {
      actions.push({
        type: "delete",
        entryType: entryTypeFromEntry(entry),
        src: entry.path,
      });
    }
  }

  if (errors.length > 0) {
    return { actions: [], errors };
  }

  return { actions: sortActions(actions), errors: [] };
};
