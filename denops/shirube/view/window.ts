import { batch } from "jsr:@denops/std@^7.0.0/batch";
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

export const renderBuffer = async (
  denops: Denops,
  bufnr: number,
  result: RenderResult,
): Promise<void> => {
  const isNv = isNvim(denops);

  // 事前情報取得 (batch内ではawaitで値を取得できないため)
  const ns = isNv ? await ensureNamespace(denops) : 0;
  const hlNs = isNv ? await ensureHighlightNamespace(denops) : 0;

  let vimWindows: number[] = [];
  if (!isNv) {
    const info = await denops.call("getbufinfo", bufnr) as Array<Record<string, unknown>>;
    vimWindows = (info[0]?.windows ?? []) as number[];
  }

  // batchで一括送信することでRPC通信のオーバーヘッドを劇的に減らす
  await batch(denops, async (denops) => {
    await denops.call("deletebufline", bufnr, 1, "$");
    await denops.call("setbufline", bufnr, 1, result.lines);
    await denops.call("setbufvar", bufnr, "&modified", 0);

    if (isNv) {
      // VirtualTextの適用
      await denops.call("nvim_buf_clear_namespace", bufnr, ns, 0, -1);
      for (const virt of result.virtTexts) {
        await denops.call("nvim_buf_set_extmark", bufnr, ns, virt.line, 0, {
          virt_text: virt.chunks,
          virt_text_pos: "right_align",
        });
      }

      // エラー行のハイライト (Neovim)
      await denops.call("nvim_buf_clear_namespace", bufnr, hlNs, 0, -1);
      for (const highlight of result.highlights) {
        await denops.call(
          "nvim_buf_add_highlight",
          bufnr,
          hlNs,
          highlight.group,
          highlight.line,
          0,
          -1,
        );
      }
    } else {
      // エラー行のハイライト (Vim)
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
      for (const winid of vimWindows) {
        await denops.call("win_execute", winid, script);
      }
    }
  });
};
