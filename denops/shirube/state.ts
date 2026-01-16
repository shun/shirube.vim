import type { Adapter } from "./adapter/interface.ts";
import type { BufferState, BufNr, Entry, MetaVisibility } from "./types.ts";

const states = new Map<BufNr, BufferState>();

export const createState = (
  bufnr: BufNr,
  url: string,
  adapter: Adapter,
  meta: MetaVisibility,
): BufferState => {
  return {
    bufnr,
    url,
    adapter,
    entries: new Map(),
    nextId: 1,
    meta: { ...meta },
  };
};

export const setState = (state: BufferState): void => {
  states.set(state.bufnr, state);
};

export const getState = (bufnr: BufNr): BufferState | undefined => {
  return states.get(bufnr);
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
