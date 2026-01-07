import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";
import type { Adapter } from "./adapter/interface.ts";
import { createLocalAdapter } from "./adapter/local.ts";
import { buildActions } from "./action/diff.ts";
import { executeActions } from "./action/executor.ts";
import { parseBuffer } from "./action/parser.ts";
import { loadConfig } from "./config.ts";
import { createState, getState, setEntries, setState } from "./state.ts";
import type { BufferState } from "./types.ts";
import { isShirubeUrl, normalizeBufnr, normalizeUrl } from "./util.ts";
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

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async on_buf_read(bufnr: unknown, url: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const resolvedUrl = normalizeUrl(url);
      const adapter = resolveAdapter(resolvedUrl);
      const entries = await adapter.listDir(resolvedUrl);
      const state = createState(resolvedBufnr, resolvedUrl, adapter);
      const registered = setEntries(state, entries);
      setState(state);
      const rendered = renderEntries(registered);
      await renderBuffer(denops, resolvedBufnr, rendered);
    },
    async on_buf_write(bufnr: unknown, url: unknown): Promise<void> {
      const resolvedBufnr = normalizeBufnr(bufnr);
      const resolvedUrl = normalizeUrl(url);
      const config = await loadConfig(denops);
      const state = getState(resolvedBufnr) ??
        createState(resolvedBufnr, resolvedUrl, resolveAdapter(resolvedUrl));
      if (!getState(resolvedBufnr)) {
        setState(state);
      }
      const lines = await denops.call("getline", 1, "$") as string[];
      const parsed = parseBuffer(lines, state);
      const diff = buildActions(state, parsed);
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
        await ensureModified(denops);
        return;
      }
      if (diff.actions.length === 0) {
        await denops.cmd("setlocal nomodified");
        return;
      }
      if (!config.skipConfirm) {
        const confirmed = await confirmActions(
          denops,
          diff.actions,
          config.uiMode,
        );
        if (!confirmed) {
          await ensureModified(denops);
          return;
        }
      }
      const executed = await executeActions(state.adapter, diff.actions);
      if (!executed.ok) {
        const message = executed.error
          ? `action failed: ${executed.error.message}`
          : "action failed";
        await notifyErrors(denops, resolvedBufnr, [message]);
        await ensureModified(denops);
        return;
      }
      const entries = await state.adapter.listDir(state.url);
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
  };
}
