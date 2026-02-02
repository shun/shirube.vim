import { dirname, join } from "@std/path";
import { SCHEME } from "../constants.ts";
import type { Action, Entry } from "../types.ts";
import { pathToUrl, urlToPath } from "../util.ts";
import type { Adapter } from "./interface.ts";

const permissionsFromMode = (
  mode: number | null | undefined,
): string | undefined => {
  if (typeof mode !== "number") {
    return undefined;
  }
  return (mode & 0o777).toString(8);
};

const ensurePath = (value: string | undefined, label: string): string => {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
};

const copyDir = async (src: string, dest: string): Promise<void> => {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else {
      await Deno.copyFile(srcPath, destPath);
    }
  }
};

export const createLocalAdapter = (): Adapter => {
  return {
    scheme: SCHEME,
    async listDir(url: string): Promise<Entry[]> {
      const basePath = urlToPath(url);
      const entries: Entry[] = [];
      for await (const item of Deno.readDir(basePath)) {
        const entryPath = join(basePath, item.name);
        const stat = await Deno.stat(entryPath);
        entries.push({
          id: 0,
          name: item.name,
          isDirectory: stat.isDirectory,
          path: entryPath,
          meta: {
            size: stat.isFile ? stat.size : undefined,
            mtime: stat.mtime ?? undefined,
            permissions: permissionsFromMode(stat.mode),
          },
        });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      return entries;
    },
    async isModifiable(url: string): Promise<boolean> {
      const path = urlToPath(url);
      try {
        const stat = await Deno.stat(path);
        return stat.isDirectory;
      } catch {
        return false;
      }
    },
    async performAction(action: Action): Promise<void> {
      switch (action.type) {
        case "create": {
          const dest = ensurePath(action.dest, "dest");
          if (action.entryType === "directory") {
            await Deno.mkdir(dest);
            return;
          }
          const file = await Deno.open(dest, { write: true, createNew: true });
          file.close();
          return;
        }
        case "delete": {
          const src = ensurePath(action.src, "src");
          await Deno.remove(src, { recursive: action.entryType === "directory" });
          return;
        }
        case "move": {
          const src = ensurePath(action.src, "src");
          const dest = ensurePath(action.dest, "dest");
          await Deno.rename(src, dest);
          return;
        }
        case "copy": {
          const src = ensurePath(action.src, "src");
          const dest = ensurePath(action.dest, "dest");
          if (action.entryType === "directory") {
            await copyDir(src, dest);
            return;
          }
          await Deno.copyFile(src, dest);
          return;
        }
      }
    },
    normalizeUrl(url: string): string {
      return pathToUrl(urlToPath(url));
    },
    getParent(url: string): string {
      const path = urlToPath(url);
      return pathToUrl(dirname(path));
    },
  };
};
