import type { Denops } from "@denops/std";
import type { RenderResult } from "./renderer.ts";

let namespaceId: number | null = null;
let highlightNamespaceId: number | null = null;

const isNvim = (denops: Denops): boolean => denops.meta.host === "nvim";

const ensureNamespace = async (denops: Denops): Promise<number> => {
  if (namespaceId !== null) {
    return namespaceId;
  }
  const id = await denops.call("nvim_create_namespace", "shirube-meta");
  namespaceId = Number(id);
  return namespaceId;
};

const ensureHighlightNamespace = async (denops: Denops): Promise<number> => {
  if (highlightNamespaceId !== null) {
    return highlightNamespaceId;
  }
  const id = await denops.call("nvim_create_namespace", "shirube-line-highlight");
  highlightNamespaceId = Number(id);
  return highlightNamespaceId;
};

const applyVirtualText = async (
  denops: Denops,
  bufnr: number,
  result: RenderResult,
): Promise<void> => {
  if (!isNvim(denops)) {
    return;
  }
  const ns = await ensureNamespace(denops);
  await denops.call("nvim_buf_clear_namespace", bufnr, ns, 0, -1);
  for (const virt of result.virtTexts) {
    await denops.call("nvim_buf_set_extmark", bufnr, ns, virt.line, 0, {
      virt_text: virt.chunks,
      virt_text_pos: "right_align",
    });
  }
};

const applyLineHighlights = async (
  denops: Denops,
  bufnr: number,
  result: RenderResult,
): Promise<void> => {
  if (!isNvim(denops)) {
    const info = await denops.call("getbufinfo", bufnr) as Array<Record<string, unknown>>;
    const windows = (info[0]?.windows ?? []) as number[];
    const errorLines = result.highlights.map((highlight) => highlight.line + 1);
    const script = [
      "if exists('w:shirube_error_matches')",
      "  for id in w:shirube_error_matches",
      "    silent! call matchdelete(id)",
      "  endfor",
      "endif",
      "let w:shirube_error_matches = []",
      `for lnum in ${JSON.stringify(errorLines)}`,
      "  call add(w:shirube_error_matches, matchaddpos('ShirubeErrorLine', [[lnum, 1, 999]]))",
      "endfor",
    ].join("\n");
    for (const winid of windows) {
      await denops.call("win_execute", winid, script);
    }
    return;
  }
  const ns = await ensureHighlightNamespace(denops);
  await denops.call("nvim_buf_clear_namespace", bufnr, ns, 0, -1);
  for (const highlight of result.highlights) {
    await denops.call(
      "nvim_buf_add_highlight",
      bufnr,
      ns,
      highlight.group,
      highlight.line,
      0,
      -1,
    );
  }
};

export const renderBuffer = async (
  denops: Denops,
  bufnr: number,
  result: RenderResult,
): Promise<void> => {
  await denops.call("deletebufline", bufnr, 1, "$");
  await denops.call("setbufline", bufnr, 1, result.lines);
  await denops.call("setbufvar", bufnr, "&modified", 0);
  await applyVirtualText(denops, bufnr, result);
  await applyLineHighlights(denops, bufnr, result);
};
