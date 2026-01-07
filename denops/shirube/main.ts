import type { Denops } from "https://deno.land/x/denops_std@v6/mod.ts";
import { main as appMain } from "./app.ts";

export async function main(denops: Denops): Promise<void> {
  await appMain(denops);
}
