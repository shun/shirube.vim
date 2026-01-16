import { SHIRUBE_VERSION } from "../src/version.ts";

async function run(): Promise<number> {
  const args = [...Deno.args];
  if (args[0] === "--") {
    args.shift();
  }
  const command = new Deno.Command(Deno.execPath(), {
    args: ["publish", "--set-version", SHIRUBE_VERSION, ...args],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await command.spawn().status;
  return status.code;
}

const code = await run();
if (code !== 0) {
  Deno.exit(code);
}
