import type { Denops } from "@denops/std";
import type { ConfirmUiMode } from "../config.ts";
import type { Logger } from "../log.ts";
import type { Action } from "../types.ts";

type ActionKind = "create" | "delete" | "move" | "copy";

type Highlight = {
  line: number;
  group: string;
};

const actionGroup = (kind: ActionKind): string => {
  switch (kind) {
    case "create":
      return "ShirubeActionCreate";
    case "delete":
      return "ShirubeActionDelete";
    case "move":
      return "ShirubeActionMove";
    case "copy":
      return "ShirubeActionCopy";
  }
};

const actionLabel = (action: Action): { text: string; kind: ActionKind } => {
  const entry = action.entryType === "directory" ? "dir" : "file";
  switch (action.type) {
    case "create":
      return { text: `[CREATE][${entry}] ${action.dest ?? ""}`, kind: "create" };
    case "delete":
      return { text: `[DELETE][${entry}] ${action.src ?? ""}`, kind: "delete" };
    case "move":
      return {
        text: `[MOVE][${entry}] ${action.src ?? ""} -> ${action.dest ?? ""}`,
        kind: "move",
      };
    case "copy":
      return {
        text: `[COPY][${entry}] ${action.src ?? ""} -> ${action.dest ?? ""}`,
        kind: "copy",
      };
  }
};

const buildLines = (
  actions: Action[],
): { lines: string[]; highlights: Highlight[] } => {
  const lines: string[] = ["Apply changes? (y/n)", ""];
  const highlights: Highlight[] = [];
  actions.forEach((action, index) => {
    const label = actionLabel(action);
    const line = index + 2;
    lines.push(label.text);
    highlights.push({ line, group: actionGroup(label.kind) });
  });
  return { lines, highlights };
};

const isNvim = (denops: Denops): boolean => denops.meta.host === "nvim";

const ensureActionHighlights = async (denops: Denops): Promise<void> => {
  await denops.cmd("highlight default link ShirubeActionCreate DiffAdd");
  await denops.cmd("highlight default link ShirubeActionDelete DiffDelete");
  await denops.cmd("highlight default link ShirubeActionMove DiffChange");
  await denops.cmd("highlight default link ShirubeActionCopy DiffText");
};

const readChoice = async (
  denops: Denops,
  logger: Logger,
): Promise<boolean> => {
  const input = await denops.call("getcharstr") as string;
  await logger.debug("confirm.input", { input });
  const normalized = input.toLowerCase();
  return normalized === "y" || input === "\r" || input === "\n";
};

const applyHighlightsNvim = async (
  denops: Denops,
  bufnr: number,
  highlights: Highlight[],
): Promise<void> => {
  for (const highlight of highlights) {
    await denops.call(
      "nvim_buf_add_highlight",
      bufnr,
      0,
      highlight.group,
      highlight.line,
      0,
      -1,
    );
  }
};

const applyHighlightsVim = async (
  denops: Denops,
  highlights: Highlight[],
): Promise<void> => {
  for (const highlight of highlights) {
    await denops.call(
      "matchaddpos",
      highlight.group,
      [[highlight.line + 1, 1]],
    );
  }
};

const confirmWithBuffer = async (
  denops: Denops,
  lines: string[],
  highlights: Highlight[],
  logger: Logger,
): Promise<boolean> => {
  const winid = await denops.call("win_getid") as number;
  await logger.debug("confirm.buffer.open", { lineCount: lines.length });
  await denops.cmd("belowright new");
  const bufnr = await denops.call("bufnr", "%") as number;
  await denops.call("setline", 1, lines);
  await denops.cmd(
    "setlocal buftype=nofile bufhidden=wipe noswapfile nobuflisted",
  );
  await denops.cmd("setlocal nomodifiable");
  await ensureActionHighlights(denops);
  if (isNvim(denops)) {
    await applyHighlightsNvim(denops, bufnr, highlights);
  } else {
    await applyHighlightsVim(denops, highlights);
  }
  await denops.cmd("redraw");
  const ok = await readChoice(denops, logger);
  await logger.debug("confirm.buffer.choice", { ok });
  await denops.cmd("close");
  await denops.call("win_gotoid", winid);
  return ok;
};

const confirmWithFloating = async (
  denops: Denops,
  lines: string[],
  highlights: Highlight[],
  logger: Logger,
): Promise<boolean> => {
  if (!isNvim(denops)) {
    const hasPopup = await denops.call("exists", "*popup_create") as number;
    await logger.debug("confirm.float.vim", { hasPopup: hasPopup === 1 });
    if (hasPopup) {
      await ensureActionHighlights(denops);
      const popupId = await denops.call("popup_create", lines, {
        title: "Shirube",
        border: [],
        padding: [0, 1, 0, 1],
        minwidth: 40,
      }) as number;
      await logger.debug("confirm.popup.open", { lineCount: lines.length });
      await denops.cmd("redraw");
      const ok = await readChoice(denops, logger);
      await logger.debug("confirm.popup.choice", { ok });
      await denops.call("popup_close", popupId);
      return ok;
    }
    const choice = await denops.call(
      "confirm",
      "Apply changes?",
      "&Yes\n&No",
      2,
    ) as number;
    await logger.debug("confirm.confirm.choice", { ok: choice === 1 });
    return choice === 1;
  }

  const buf = await denops.call("nvim_create_buf", false, true) as number;
  await denops.call("nvim_buf_set_lines", buf, 0, -1, true, lines);
  await denops.call("nvim_buf_set_option", buf, "modifiable", false);
  await denops.call("nvim_buf_set_option", buf, "buftype", "nofile");
  await denops.call("nvim_buf_set_option", buf, "bufhidden", "wipe");
  await ensureActionHighlights(denops);
  await applyHighlightsNvim(denops, buf, highlights);

  const columns = await denops.call("nvim_get_option", "columns") as number;
  const linesCount = await denops.call("nvim_get_option", "lines") as number;
  const maxWidth = Math.min(Math.floor(columns * 0.8), 120);
  const width = Math.max(Math.min(maxWidth, columns - 4), 40);
  const height = Math.min(lines.length + 2, linesCount - 4);
  const row = Math.max(Math.floor((linesCount - height) / 2), 0);
  const col = Math.max(Math.floor((columns - width) / 2), 0);

  await logger.debug("confirm.float.open", { width, height, row, col });
  const win = await denops.call("nvim_open_win", buf, true, {
    relative: "editor",
    row,
    col,
    width,
    height,
    style: "minimal",
    border: "single",
  }) as number;
  await denops.call("nvim_win_set_option", win, "wrap", true);
  await logger.debug("confirm.float.win", { win });
  await denops.cmd("redraw");
  const ok = await readChoice(denops, logger);
  await logger.debug("confirm.float.choice", { ok });
  await denops.call("nvim_win_close", win, true);
  return ok;
};

export const confirmActions = async (
  denops: Denops,
  actions: Action[],
  confirmUiMode: ConfirmUiMode,
  logger: Logger,
): Promise<boolean> => {
  const { lines, highlights } = buildLines(actions);
  await logger.debug("confirm.start", {
    actionCount: actions.length,
    confirmUiMode,
    host: denops.meta.host,
  });
  const mode = await denops.call("mode") as string;
  await logger.debug("confirm.context", { mode });
  if (confirmUiMode === "buffer") {
    return await confirmWithBuffer(denops, lines, highlights, logger);
  }
  return await confirmWithFloating(denops, lines, highlights, logger);
};
