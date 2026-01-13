import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";
import type { Adapter } from "./adapter/interface.ts";
import { createLocalAdapter } from "./adapter/local.ts";
import { buildActions } from "./action/diff.ts";
import { executeActions } from "./action/executor.ts";
import { parseBuffer } from "./action/parser.ts";
import {
  loadConfig,
  type Config,
  type GlobalKeymapAction,
  type KeymapAction,
} from "./config.ts";
import { createLogger } from "./log.ts";
import { createState, getState, setEntries, setState } from "./state.ts";
import type { Action, BufferState } from "./types.ts";
import {
  isShirubeUrl,
  normalizeBufnr,
  normalizeUrl,
  urlToPath,
} from "./util.ts";
import { confirmActions } from "./view/confirm.ts";
import { renderEntries } from "./view/renderer.ts";
import { renderBuffer } from "./view/window.ts";

const resolveAdapter = (url: string): Adapter => {
  if (isShirubeUrl(url)) {
    return createLocalAdapter();
  }
  throw new Error(`unsupported url: ${url}`);
};

const setBufferVar = async (
  denops: Denops,
  bufnr: number,
  name: string,
  value: unknown,
): Promise<void> => {
  await denops.call("setbufvar", bufnr, name, value);
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
  bufnr: number,
  errors: string[],
): Promise<void> => {
  if (errors.length === 0) {
    return;
  }
  await setBufferVar(denops, bufnr, "shirube_errors", errors);
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

const keymapActions: Record<KeymapAction, string> = {
  open_cursor: "shirube#open_cursor()",
  open_parent: "shirube#open_parent()",
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

type StartupDecision = {
  target: string | null;
  reason: string;
  debug: Record<string, unknown>;
};

const resolveStartupDir = async (
  denops: Denops,
  config: Config,
): Promise<StartupDecision> => {
  const debug: Record<string, unknown> = {
    openOnStartup: config.openOnStartup,
  };
  if (!config.openOnStartup) {
    return { target: null, reason: "open_on_startup=false", debug };
  }
  const argc = await denops.call("argc") as number;
  debug.argc = argc;
  const argv = await denops.call("argv") as unknown;
  debug.argv = argv;
  if (typeof argc !== "number" || argc !== 1) {
    return { target: null, reason: "argc!=1", debug };
  }
  const arg = await denops.call("argv", 0) as string;
  debug.argv0 = arg;
  if (typeof arg !== "string" || arg.length === 0) {
    return { target: null, reason: "argv0 empty", debug };
  }
  const argAbs = await denops.call("fnamemodify", arg, ":p") as string;
  debug.argv0Abs = argAbs;
  const isDir = await denops.call("isdirectory", arg) as number;
  debug.argv0IsDir = isDir;
  const isFile = await denops.call("filereadable", arg) as number;
  debug.argv0IsFile = isFile;
  if (!isDir) {
    return { target: null, reason: "argv0 not directory", debug };
  }
  const cwd = await denops.call("getcwd") as string;
  debug.cwd = cwd;
  const bufname = await denops.call("bufname", "%") as string;
  debug.bufname = bufname;
  const bufIsShirube = typeof bufname === "string" && isShirubeUrl(bufname);
  debug.bufIsShirube = bufIsShirube;
  if (bufIsShirube) {
    return { target: null, reason: "already shirube", debug };
  }
  return { target: arg, reason: "ok", debug };
};

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async on_vim_enter(): Promise<void> {
      const config = await loadConfig(denops);
      const logger = createLogger(config);
      const decision = await resolveStartupDir(denops, config);
      await logger.debug("vim_enter.check", {
        reason: decision.reason,
        ...decision.debug,
      });
      if (!decision.target) {
        return;
      }
      await logger.debug("vim_enter.open", { path: decision.target });
      try {
        const pathExpr = await denops.call("string", decision.target) as string;
        const timerId = await denops.eval(
          `timer_start(0, {-> shirube#open(${pathExpr})})`,
        ) as number;
        await logger.debug("vim_enter.defer", { timerId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logger.error("vim_enter.defer.error", { message });
      }
    },
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
      await logger.debug("buf_read.entries", { count: entries.length });
      const state = createState(resolvedBufnr, resolvedUrl, adapter);
      const registered = setEntries(state, entries);
      setState(state);
      const rendered = renderEntries(registered);
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
        uiMode: config.uiMode,
      });
      const state = getState(resolvedBufnr) ??
        createState(resolvedBufnr, resolvedUrl, resolveAdapter(resolvedUrl));
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
      await setBufferVar(
        denops,
        resolvedBufnr,
        "shirube_actions",
        diff.actions,
      );
      await setBufferVar(
        denops,
        resolvedBufnr,
        "shirube_errors",
        diff.errors,
      );
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
          uiMode: config.uiMode,
        });
        const confirmed = await confirmActions(
          denops,
          diff.actions,
          config.uiMode,
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
      await logger.debug("buf_write.render.entries", { count: entries.length });
      const registered = setEntries(state, entries);
      setState(state);
      const rendered = renderEntries(registered);
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
          await setBufferVar(
            denops,
            resolvedBufnr,
            "shirube_errors",
            result.errors,
          );
          await notifyErrors(denops, resolvedBufnr, result.errors);
        }
        return;
      }
      await setBufferVar(denops, resolvedBufnr, "shirube_errors", []);
      await openTarget(denops, result.target.path, result.target.entryType);
    },
    async open_from_current(): Promise<void> {
      await openFromCurrent(denops);
    },
  };
  const config = await loadConfig(denops);
  await applyGlobalKeymaps(denops, config);
}
