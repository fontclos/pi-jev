import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { gateToolCall } from "./guard.js";
import { createOpenRouterJevAdapter } from "./jev.js";

export default function piJev(pi: ExtensionAPI): void {
  const decisionAdapter = createOpenRouterJevAdapter();

  pi.on("tool_call", async (event, ctx) =>
    gateToolCall(
      { toolName: event.toolName, input: event.input },
      {
        hasUI: ctx.hasUI,
        decisionAdapter,
        confirm: (title, message) => ctx.ui.confirm(title, message),
      },
    ),
  );
}
