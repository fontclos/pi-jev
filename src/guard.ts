import { classifyToolCall, safeDisplayText, type ToolCall } from "./policy.js";

export interface GateContext {
  hasUI: boolean;
  confirm?: (title: string, message: string) => Promise<boolean | undefined>;
}

export interface BlockResult {
  block: true;
  reason: string;
}

function toInputRecord(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
}

export async function gateToolCall(
  event: { toolName: string; input: unknown },
  context: GateContext,
): Promise<BlockResult | undefined> {
  const call: ToolCall = { toolName: event.toolName, input: toInputRecord(event.input) };
  const policy = classifyToolCall(call);

  if (policy.decision === "allow") return undefined;
  if (policy.decision === "block") return { block: true, reason: policy.reason };

  if (!context.hasUI || !context.confirm) {
    return {
      block: true,
      reason: `${policy.reason} No approval UI is available, so the call was blocked.`,
    };
  }

  const subject = policy.subject ? safeDisplayText(policy.subject) : "";
  const message = subject
    ? `${policy.reason}\n\nRequested action:\n${subject}`
    : policy.reason;

  try {
    const approved = await context.confirm(`Review ${event.toolName} call`, message);
    if (approved === true) return undefined;
    return { block: true, reason: "The user did not approve this tool call." };
  } catch {
    return {
      block: true,
      reason: "Approval could not be completed, so the tool call was blocked.",
    };
  }
}
