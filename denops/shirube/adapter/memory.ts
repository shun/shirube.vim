import type { Adapter } from "./interface.ts";
import type { Action, Entry } from "../types.ts";
import { dirname } from "@std/path";
import { pathToUrl, urlToPath } from "../util.ts";

export class MemoryAdapter implements Adapter {
  scheme = "mem";
  // path -> isDir
  files: Map<string, boolean>;

  constructor(initialFiles: Record<string, boolean> = {}) {
    this.files = new Map(Object.entries(initialFiles));
  }

  async listDir(url: string): Promise<Entry[]> {
    await Promise.resolve();
    const dirPath = urlToPath(url);
    const entries: Entry[] = [];

    for (const [path, isDir] of this.files) {
      // Check if path is direct child of dirPath
      const parent = dirname(path);
      if (parent === dirPath && path !== dirPath) {
        const name = path.split("/").pop() || "";
        entries.push({
          id: 0, // ID is assigned by state, not adapter
          name,
          isDirectory: isDir,
          path,
          meta: {
            size: 0,
            permissions: isDir ? "755" : "644",
          },
        });
      }
    }
    return entries;
  }

  async isModifiable(_url: string): Promise<boolean> {
    await Promise.resolve();
    return true;
  }

  async performAction(action: Action): Promise<void> {
    await Promise.resolve();
    switch (action.type) {
      case "create": {
        if (!action.dest) throw new Error("dest required");
        this.files.set(action.dest, action.entryType === "directory");
        break;
      }
      case "delete": {
        if (!action.src) throw new Error("src required");
        // Naive delete (no recursive check for simplicity in mock)
        this.files.delete(action.src);
        break;
      }
      case "move": {
        if (!action.src || !action.dest) throw new Error("src/dest required");
        const isDir = this.files.get(action.src);
        if (isDir === undefined) throw new Error(`source not found: ${action.src}`);
        this.files.delete(action.src);
        this.files.set(action.dest, isDir);
        break;
      }
      case "copy": {
        if (!action.src || !action.dest) throw new Error("src/dest required");
        const isDir = this.files.get(action.src);
        if (isDir === undefined) throw new Error(`source not found: ${action.src}`);
        this.files.set(action.dest, isDir);
        break;
      }
    }
  }

  normalizeUrl(url: string): string {
    return pathToUrl(urlToPath(url));
  }

  getParent(url: string): string {
    const path = urlToPath(url);
    return pathToUrl(dirname(path));
  }
}
