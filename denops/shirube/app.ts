import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";
import type { Adapter } from "./adapter/interface.ts";
import { createLocalAdapter } from "./adapter/local.ts";
import { buildActions } from "./action/diff.ts";
import { executeActions } from "./action/executor.ts";
import { parseBuffer } from "./action/parser.ts";
import { type Config, type GlobalKeymapAction, type KeymapAction, loadConfig } from "./config.ts";
import { createLogger } from "./log.ts";
import { createState, getState, setEntries, setState } from "./state.ts";
import type { Action, BufferState, Entry, MetaVisibility } from "./types.ts";
import { generateCopyName, isShirubeUrl, normalizeBufnr, normalizeUrl, urlToPath } from "./util.ts";
import { confirmActions } from "./view/confirm.ts";
import { renderEntries } from "./view/renderer.ts";
import { renderBuffer } from "./view/window.ts";

const resolveAdapter = (url: string): Adapter => {
  if (isShirubeUrl(url)) {
    return createLocalAdapter();
  }
  throw new Error(`unsupported url: ${url}`);
};

const openTarget = async (
  denops: Denops,
  path: string,
  entryType: "file" | "directory",
): Promise<void> => {
  const escaped = await denops.call("fnameescape", path) as string;
  if (entryType === "directory") {
    await denops.cmd(`Shirube ${escaped}`);
    return;
  }
  await denops.cmd(`edit ${escaped}`);
};

type OpenTargetResult =
  | { target: { path: string; entryType: "file" | "directory" }; errors: [] }
  | { target: null; errors: string[] }
  | { target: null; errors: [] };

const resolveOpenTarget = (
  state: BufferState,
  line: string,
): OpenTargetResult => {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return { target: null, errors: [] };
  }
  const parsed = parseBuffer([line], state);
  if (parsed.errors.length > 0) {
    return { target: null, errors: parsed.errors };
  }
  const existing = parsed.existing.entries().next();
  if (!existing.done) {
    const [id, path] = existing.value;
    const entry = state.entries.get(id);
    if (!entry) {
      return { target: null, errors: [`unknown id: ${id}`] };
    }
    return {
      target: {
        path,
        entryType: entry.isDirectory ? "directory" : "file",
      },
      errors: [],
    };
  }
  const created = parsed.created[0];
  if (created) {
    return {
      target: {
        path: created.path,
        entryType: created.entryType,
      },
      errors: [],
    };
  }
  return { target: null, errors: ["invalid line"] };
};

const notifyErrors = async (
  denops: Denops,
  _bufnr: number,
  errors: string[],
): Promise<void> => {
  if (errors.length === 0) {
    return;
  }
  await denops.cmd(`echoerr ${JSON.stringify(`shirube: ${errors[0]}`)}`);
};

const ensureModified = async (denops: Denops): Promise<void> => {
  await denops.cmd("setlocal modified");
};

const summarizeActions = (actions: Action[]): Record<string, unknown>[] => {
  return actions.map((action) => ({
    type: action.type,
    entryType: action.entryType,
    src: action.src,
    dest: action.dest,
  }));
};

const renderState = async (
  denops: Denops,
  state: BufferState,
): Promise<void> => {
  const entries = Array.from(state.entries.values());
  const rendered = renderEntries(entries, state.meta);
  await renderBuffer(denops, state.bufnr, rendered);
};

const groupWeight = (
  entry: Entry,
  group: Config["sort"]["group"],
): number => {
  switch (group) {
    case "directories-first":
      return entry.isDirectory ? 0 : 1;
    case "files-first":
      return entry.isDirectory ? 1 : 0;
    default:
      return 0;
  }
};

const sortEntries = (entries: Entry[], config: Config): Entry[] => {
  if (entries.length <= 1) {
    return entries;
  }
  const sorted = entries.slice();
  sorted.sort((a, b) => {
    const group = config.sort.group;
    const groupDiff = groupWeight(a, group) - groupWeight(b, group);
    if (groupDiff !== 0) {
      return groupDiff;
    }
    return a.name.localeCompare(b.name);
  });
  return sorted;
};

const toggleMeta = async (
  denops: Denops,
  bufnr: unknown,
  key: keyof MetaVisibility,
): Promise<void> => {
  const resolvedBufnr = normalizeBufnr(bufnr);
  const state = getState(resolvedBufnr);
  if (!state) {
    await notifyErrors(denops, resolvedBufnr, ["state not found"]);
    return;
  }
  state.meta[key] = !state.meta[key];
  await renderState(denops, state);
};

const keymapActions: Record<KeymapAction, string> = {
  open_cursor: "shirube#open_cursor()",
  open_parent: "shirube#open_parent()",
  close: "shirube#close()",
  toggle_size: "shirube#toggle_size()",
  toggle_permissions: "shirube#toggle_permissions()",
  reload: "shirube#reload()",
};

const globalKeymapActions: Record<GlobalKeymapAction, string> = {
  open_shirube: "shirube#open_from_current()",
};

const applyKeymaps = async (
  denops: Denops,
  config: Config,
): Promise<void> => {
  const entries = Object.entries(config.keymaps);
  if (entries.length === 0) {
    return;
  }
  for (const [lhs, action] of entries) {
    const rhs = keymapActions[action];
    if (!rhs) {
      continue;
    }
    await denops.cmd(`nnoremap <silent><buffer> ${lhs} :call ${rhs}<cr>`);
  }
};

const applyGlobalKeymaps = async (
  denops: Denops,
  config: Config,
): Promise<void> => {
  const entries = Object.entries(config.keymapsGlobal);
  if (entries.length === 0) {
    return;
  }
  for (const [lhs, action] of entries) {
    const rhs = globalKeymapActions[action];
    if (!rhs) {
      continue;
    }
    await denops.cmd(`nnoremap <silent> ${lhs} :call ${rhs}<cr>`);
  }
};

const openFromCurrent = async (denops: Denops): Promise<void> => {
  const bufname = await denops.call("bufname", "%") as string;
  if (typeof bufname === "string" && isShirubeUrl(bufname)) {
    const adapter = resolveAdapter(bufname);
    const parentUrl = adapter.getParent(bufname);
    const parentPath = urlToPath(parentUrl);
    await openTarget(denops, parentPath, "directory");
    return;
  }
  const filePath = await denops.call("expand", "%:p") as string;
  const target = filePath.length > 0
    ? await denops.call("expand", "%:p:h") as string
    : await denops.call("getcwd") as string;
  await openTarget(denops, target, "directory");
};

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async on_buf_read(bufnr: unknown, url: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const resolvedUrl = normalizeUrl(url);
      const config = await loadConfig(denops);
      const logger = createLogger(config);
      await logger.debug("buf_read.start", {
        bufnr: resolvedBufnr,
        url: resolvedUrl,
      });
      const adapter = resolveAdapter(resolvedUrl);
      const entries = await adapter.listDir(resolvedUrl);
      const sorted = sortEntries(entries, config);
      await logger.debug("buf_read.entries", { count: entries.length });
      const state = createState(resolvedBufnr, resolvedUrl, adapter, config.meta);
      const registered = setEntries(state, sorted);
      setState(state);
      const rendered = renderEntries(registered, state.meta);
      await renderBuffer(denops, resolvedBufnr, rendered);
      await applyKeymaps(denops, config);
    },
    async on_buf_write(bufnr: unknown, url: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const resolvedUrl = normalizeUrl(url);
      const config = await loadConfig(denops);
      const logger = createLogger(config);
      await logger.debug("buf_write.start", {
        bufnr: resolvedBufnr,
        url: resolvedUrl,
        skipConfirm: config.skipConfirm,
        confirmUiMode: config.confirmUiMode,
      });
      const state = getState(resolvedBufnr) ??
        createState(
          resolvedBufnr,
          resolvedUrl,
          resolveAdapter(resolvedUrl),
          config.meta,
        );
      if (!getState(resolvedBufnr)) {
        setState(state);
      }
      const lines = await denops.call("getline", 1, "$") as string[];
      await logger.debug("buf_write.lines", { count: lines.length });
      const parsed = parseBuffer(lines, state);
      await logger.debug("buf_write.parsed", {
        existing: parsed.existing.size,
        created: parsed.created.length,
        errors: parsed.errors,
      });
      const diff = buildActions(state, parsed);
      await logger.debug("buf_write.diff", {
        actionCount: diff.actions.length,
        errors: diff.errors,
        actions: summarizeActions(diff.actions),
      });
      await notifyErrors(denops, resolvedBufnr, diff.errors);
      if (diff.errors.length > 0) {
        await logger.error("buf_write.errors", { errors: diff.errors });
        await ensureModified(denops);
        return;
      }
      if (diff.actions.length === 0) {
        await logger.debug("buf_write.no_actions");
        await denops.cmd("setlocal nomodified");
        return;
      }
      if (!config.skipConfirm) {
        await logger.debug("buf_write.confirm.start", {
          actionCount: diff.actions.length,
          confirmUiMode: config.confirmUiMode,
        });
        const confirmed = await confirmActions(
          denops,
          diff.actions,
          config.confirmUiMode,
          logger,
        );
        await logger.debug("buf_write.confirm.result", { confirmed });
        if (!confirmed) {
          await ensureModified(denops);
          return;
        }
      } else {
        await logger.debug("buf_write.confirm.skipped");
      }
      await logger.debug("buf_write.execute.start", {
        actionCount: diff.actions.length,
      });
      const executed = await executeActions(state.adapter, diff.actions);
      if (!executed.ok) {
        const message = executed.error
          ? `action failed: ${executed.error.message}`
          : "action failed";
        await logger.error("buf_write.execute.error", {
          message,
          action: executed.error?.action,
        });
        await notifyErrors(denops, resolvedBufnr, [message]);
        await ensureModified(denops);
        return;
      }
      await logger.debug("buf_write.execute.ok");
      const entries = await state.adapter.listDir(state.url);
      const sorted = sortEntries(entries, config);
      await logger.debug("buf_write.render.entries", { count: entries.length });
      const registered = setEntries(state, sorted);
      setState(state);
      const rendered = renderEntries(registered, state.meta);
      await renderBuffer(denops, resolvedBufnr, rendered);
    },
    async open_cursor(bufnr: unknown, line: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const lineText = typeof line === "string" ? line : "";
      const state = getState(resolvedBufnr);
      if (!state) {
        await notifyErrors(denops, resolvedBufnr, ["state not found"]);
        return;
      }
      const result = resolveOpenTarget(state, lineText);
      if (result.target === null) {
        if (result.errors.length > 0) {
          await notifyErrors(denops, resolvedBufnr, result.errors);
        }
        return;
      }
      await openTarget(denops, result.target.path, result.target.entryType);
    },
    async open_from_current(): Promise<void> {
      await openFromCurrent(denops);
    },
    async toggle_size(bufnr: unknown): Promise<void> {
      await toggleMeta(denops, bufnr, "size");
    },
    async toggle_permissions(bufnr: unknown): Promise<void> {
      await toggleMeta(denops, bufnr, "permissions");
    },
    async reload(bufnr: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const config = await loadConfig(denops);
      const logger = createLogger(config);
      const state = getState(resolvedBufnr);
      if (!state) {
        await logger.error("reload.no_state", { bufnr: resolvedBufnr });
        await notifyErrors(denops, resolvedBufnr, ["state not found"]);
        return;
      }
      await logger.debug("reload.start", { bufnr: resolvedBufnr, url: state.url });
      const cursor = await denops.call("getcurpos") as number[];
      const lnum = cursor[1];
      const entries = await state.adapter.listDir(state.url);
      await logger.debug("reload.entries", { count: entries.length });
      const sorted = sortEntries(entries, config);
      const registered = setEntries(state, sorted);
      setState(state);
      const rendered = renderEntries(registered, state.meta);
      await logger.debug("reload.render", { lines: rendered.lines.length });
      await renderBuffer(denops, resolvedBufnr, rendered);
      const maxLine = rendered.lines.length;
      await denops.call("cursor", Math.min(lnum, maxLine), cursor[2]);
      await logger.debug("reload.done");
    },
    async constrain_cursor(): Promise<void> {
      const bufnr = await denops.call("bufnr", "%") as number;
      const filetype = await denops.call("getbufvar", bufnr, "&filetype") as string;
      if (filetype !== "shirube") {
        return;
      }
      const cursor = await denops.call("getcurpos") as number[];
      const lnum = cursor[1];
      const col = cursor[2];
      const line = await denops.call("getline", lnum) as string;
      const match = line.match(/^\/(\d+) /);
      if (!match) {
        return;
      }
      const minCol = match[0].length + 1;
      if (col < minCol) {
        await denops.call("cursor", lnum, minCol);
      }
    },
    async auto_rename_paste(bufnr: unknown, lnum: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const lineNum = Number(lnum);
      if (!Number.isInteger(lineNum) || lineNum <= 0) {
        return;
      }
      const config = await loadConfig(denops);
      const logger = createLogger(config);
      const state = getState(resolvedBufnr);
      if (!state) {
        await logger.debug("auto_rename_paste.no_state", { bufnr: resolvedBufnr });
        return;
      }
      const line = await denops.call("getline", lineNum) as string;
      const match = line.match(/^\/(\d+) /);
      if (!match) {
        await logger.debug("auto_rename_paste.no_id", { line });
        return;
      }
      const id = Number(match[1]);
      const lines = await denops.call("getline", 1, "$") as string[];
      const sameIdLines: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\/(\d+) /);
        if (m && Number(m[1]) === id) {
          sameIdLines.push(i + 1);
        }
      }
      if (sameIdLines.length <= 1) {
        await logger.debug("auto_rename_paste.single", { id });
        return;
      }
      const entry = state.entries.get(id);
      if (!entry) {
        await logger.debug("auto_rename_paste.unknown_id", { id });
        return;
      }
      const basePath = urlToPath(state.url);
      const existingPaths = new Set<string>();
      for (const entry of state.entries.values()) {
        existingPaths.add(entry.path);
      }
      try {
        for await (const item of Deno.readDir(basePath)) {
          const itemPath = join(basePath, item.name);
          existingPaths.add(itemPath);
        }
      } catch {
        // Ignore readDir errors
      }
      for (let i = 1; i < sameIdLines.length; i++) {
        const targetLine = sameIdLines[i];
        const newPath = generateCopyName(entry.path, existingPaths);
        existingPaths.add(newPath);
        const newName = newPath.slice(basePath.length + 1);
        const newLine = `/${id} ${newName}`;
        await denops.call("setline", targetLine, newLine);
        await logger.debug("auto_rename_paste.renamed", {
          line: targetLine,
          oldName: entry.name,
          newName,
        });
      }
    },
  };
  const config = await loadConfig(denops);
  await applyGlobalKeymaps(denops, config);
}
