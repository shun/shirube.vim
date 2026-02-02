import type { Denops } from "@denops/std";
import { main as appMain } from "./app.ts";

export async function main(denops: Denops): Promise<void> {
  await appMain(denops);
}
