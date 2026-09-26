import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { gateToolCall } from "./guard.js";

export default function piJev(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, ctx) =>
    gateToolCall(
      { toolName: event.toolName, input: event.input },
      {
        hasUI: ctx.hasUI,
        confirm: (title, message) => ctx.ui.confirm(title, message),
      },
    ),
  );
}
