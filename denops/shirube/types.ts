import type { Adapter } from "./adapter/interface.ts";

export type BufNr = number;
export type EntryId = number;
export type MetaVisibility = {
  size: boolean;
  permissions: boolean;
};

export interface EntryMeta {
  size?: number;
  mtime?: Date;
  permissions?: string;
}

export interface Entry {
  id: EntryId;
  name: string;
  isDirectory: boolean;
  path: string;
  meta: EntryMeta;
}

export interface BufferState {
  bufnr: BufNr;
  url: string;
  adapter: Adapter;
  entries: Map<EntryId, Entry>;
  nextId: number;
  meta: MetaVisibility;
}

export type ActionType = "create" | "delete" | "move" | "copy";

export interface Action {
  type: ActionType;
  entryType: "file" | "directory";
  src?: string;
  dest?: string;
}
