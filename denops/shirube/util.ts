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
