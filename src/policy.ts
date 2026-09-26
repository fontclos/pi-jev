export type GateDecision = "allow" | "ask" | "block";

export interface PolicyResult {
  decision: GateDecision;
  reason: string;
  subject?: string;
}

export interface ToolCall {
  toolName: string;
  input: Record<string, unknown>;
}

const READ_ONLY_TOOLS = new Set(["read", "grep", "find", "ls"]);

// These narrow signatures block common high-impact shell actions before Jev
// runs. They are defense-in-depth only: shell text is not safely parsed here.
const HARD_DENY_COMMANDS: RegExp[] = [
  /\bsudo\b/i,
  /\bgit\s+push\b[^;\n]*--force\b/i,
  /\bgit\s+reset\b[^;\n]*--hard\b/i,
  /\brm\s+-[^\s]*r[^\s]*f\b/i,
  /\brm\s+-[^\s]*f[^\s]*r\b/i,
  /\brm\s+-r\s+-f\b/i,
  /\bmkfs(?:\.\w+)?\b/i,
  /\bdd\b[^;\n]*\bof=\/dev\/[^\s]+/i,
  /\b(?:shutdown|reboot|poweroff)\b/i,
  /(?:\bcurl\b|\bwget\b)[^;\n]*\|\s*(?:sh|bash)\b/i,
];

// Allow only a few exact shell commands in the first version. Compound shell
// expressions, extra flags, and all commands with side effects require review.
const EXACT_READ_ONLY_COMMANDS = new Set([
  "pwd",
  "git status --short",
  "git diff --stat",
  "git diff --cached --stat",
  "git log --oneline -5",
]);

export function classifyToolCall(call: ToolCall): PolicyResult {
  const toolName = call.toolName.trim();

  if (!toolName) {
    return { decision: "block", reason: "The tool call has no tool name." };
  }

  if (READ_ONLY_TOOLS.has(toolName)) {
    return { decision: "allow", reason: "Read-only Pi tool." };
  }

  if (toolName === "bash") {
    const command = typeof call.input.command === "string" ? call.input.command.trim() : "";

    if (!command) {
      return { decision: "block", reason: "The shell command is missing or empty." };
    }

    if (HARD_DENY_COMMANDS.some((pattern) => pattern.test(command))) {
      return {
        decision: "block",
        reason: "This shell command matches a locally blocked high-impact action.",
        subject: command,
      };
    }

    if (EXACT_READ_ONLY_COMMANDS.has(command)) {
      return { decision: "allow", reason: "Exact read-only shell command." };
    }

    return {
      decision: "ask",
      reason: "Shell commands require approval unless they match the exact read-only allowlist.",
      subject: command,
    };
  }

  if (toolName === "write" || toolName === "edit") {
    const path = typeof call.input.path === "string" ? call.input.path : undefined;
    return {
      decision: "ask",
      reason: "File mutations require approval.",
      subject: path,
    };
  }

  return {
    decision: "ask",
    reason: "This tool is not in the read-only allowlist.",
  };
}

export function safeDisplayText(value: string, maxLength = 240): string {
  const oneLine = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength - 1)}…` : oneLine;
}
