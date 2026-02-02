import type { Action, Entry } from "../types.ts";

export interface Adapter {
  scheme: string;
  listDir(url: string): Promise<Entry[]>;
  isModifiable(url: string): Promise<boolean>;
  performAction(action: Action): Promise<void>;
  normalizeUrl(url: string): string;
  getParent(url: string): string;
}
