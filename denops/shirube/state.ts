import type { Adapter } from "./adapter/interface.ts";
import type { BufferState, BufNr, Entry } from "./types.ts";

const states = new Map<BufNr, BufferState>();

export const createState = (
  bufnr: BufNr,
  url: string,
  adapter: Adapter,
): BufferState => {
  return {
    bufnr,
    url,
    adapter,
    entries: new Map(),
    nextId: 1,
  };
};

export const setState = (state: BufferState): void => {
  states.set(state.bufnr, state);
};

export const getState = (bufnr: BufNr): BufferState | undefined => {
  return states.get(bufnr);
};

export const clearState = (bufnr: BufNr): void => {
  states.delete(bufnr);
};

export const setEntries = (state: BufferState, entries: Entry[]): Entry[] => {
  state.entries.clear();
  state.nextId = 1;
  return addEntries(state, entries);
};

const addEntries = (state: BufferState, entries: Entry[]): Entry[] => {
  return entries.map((entry) => {
    const id = state.nextId++;
    const value = { ...entry, id };
    state.entries.set(id, value);
    return value;
  });
};
