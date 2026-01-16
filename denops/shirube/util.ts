import { URL_PREFIX } from "./constants.ts";

export const normalizeBufnr = (value: unknown): number => {
  const bufnr = Number(value);
  if (!Number.isInteger(bufnr) || bufnr <= 0) {
    throw new Error(`invalid bufnr: ${value}`);
  }
  return bufnr;
};

export const normalizeUrl = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`invalid url: ${value}`);
  }
  return value;
};

export const isShirubeUrl = (url: string): boolean => {
  return url.startsWith(URL_PREFIX);
};

export const urlToPath = (url: string): string => {
  if (!isShirubeUrl(url)) {
    throw new Error(`unsupported url: ${url}`);
  }
  const path = url.slice(URL_PREFIX.length);
  if (path.length === 0) {
    throw new Error(`empty path: ${url}`);
  }
  return path;
};

export const pathToUrl = (path: string): string => {
  if (path.length === 0) {
    throw new Error("path is empty");
  }
  if (isShirubeUrl(path)) {
    return path;
  }
  return `${URL_PREFIX}${path}`;
};

export const generateCopyName = (
  originalPath: string,
  existingPaths: Set<string>,
): string => {
  const isDir = originalPath.endsWith("/");
  const basePath = isDir ? originalPath.slice(0, -1) : originalPath;
  const lastDot = basePath.lastIndexOf(".");
  const lastSlash = basePath.lastIndexOf("/");
  const hasExt = lastDot > lastSlash && lastDot > 0;
  const base = hasExt ? basePath.slice(0, lastDot) : basePath;
  const ext = hasExt ? basePath.slice(lastDot) : "";
  const suffix = isDir ? "/" : "";

  let candidate = `${base}_copy${ext}${suffix}`;
  if (!existingPaths.has(candidate)) {
    return candidate;
  }

  let n = 2;
  while (true) {
    candidate = `${base}_copy_${n}${ext}${suffix}`;
    if (!existingPaths.has(candidate)) {
      return candidate;
    }
    n++;
  }
};
