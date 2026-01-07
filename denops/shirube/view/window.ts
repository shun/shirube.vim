import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";
import type { RenderResult } from "./renderer.ts";

let namespaceId: number | null = null;

const isNvim = (denops: Denops): boolean => denops.meta.host === "nvim";

const ensureNamespace = async (denops: Denops): Promise<number> => {
  if (namespaceId !== null) {
    return namespaceId;
  }
  const id = await denops.call("nvim_create_namespace", "shirube-meta");
  namespaceId = Number(id);
  return namespaceId;
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
      virt_text_pos: "eol",
    });
  }
};

export const renderBuffer = async (
  denops: Denops,
  bufnr: number,
  result: RenderResult,
): Promise<void> => {
  await denops.cmd("silent %delete _");
  await denops.call("setline", 1, result.lines);
  await denops.cmd("setlocal nomodified");
  await applyVirtualText(denops, bufnr, result);
};
