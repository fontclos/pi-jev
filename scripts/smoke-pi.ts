import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";

const agentDir = mkdtempSync(join(tmpdir(), "pi-jev-smoke-"));
try {
  const loaded = await discoverAndLoadExtensions(
    [resolve(".")],
    process.cwd(),
    agentDir,
  );
  if (loaded.errors.length || loaded.extensions.length !== 1) {
    throw new Error(`Pi extension load failed: ${JSON.stringify(loaded.errors)}`);
  }

  const handler = loaded.extensions[0]?.handlers.get("tool_call")?.[0];
  if (!handler) throw new Error("Pi did not register the tool_call handler.");

  const ctx = { hasUI: false, ui: { confirm: async () => false } };
  const allowed = await handler({ type: "tool_call", toolName: "bash", input: { command: "pwd" } }, ctx);
  const denied = await handler({ type: "tool_call", toolName: "bash", input: { command: "git push --force" } }, ctx) as
    | { block?: boolean }
    | undefined;

  if (allowed !== undefined || denied?.block !== true) {
    throw new Error("Loaded Pi gate did not enforce its expected policy.");
  }
  console.log("Pi loaded the pi-jev package manifest and the tool_call gate enforced allow/block.");
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}
