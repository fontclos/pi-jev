import { describe, expect, it } from "vitest";
import { classifyToolCall, safeDisplayText } from "../src/policy.js";

describe("classifyToolCall", () => {
  it.each(["read", "grep", "find", "ls"])("allows read-only Pi tool %s", (toolName) => {
    expect(classifyToolCall({ toolName, input: {} }).decision).toBe("allow");
  });

  it.each([
    "pwd",
    "git status --short",
    "git diff --stat",
    "git diff --cached --stat",
    "git log --oneline -5",
  ])("allows exact read-only command %s", (command) => {
    expect(classifyToolCall({ toolName: "bash", input: { command } }).decision).toBe("allow");
  });

  it.each([
    "git status --short && rm -rf ./build",
    "echo ok",
    "npm install",
    "git push --force",
    "python -c 'print(1)'",
  ])("asks before shell command %s", (command) => {
    expect(classifyToolCall({ toolName: "bash", input: { command } }).decision).toBe("ask");
  });

  it.each(["write", "edit", "custom_tool"])("asks before %s", (toolName) => {
    expect(classifyToolCall({ toolName, input: { path: "src/file.ts" } }).decision).toBe("ask");
  });

  it("blocks a missing shell command", () => {
    expect(classifyToolCall({ toolName: "bash", input: {} }).decision).toBe("block");
  });

  it("blocks a missing tool name", () => {
    expect(classifyToolCall({ toolName: " ", input: {} }).decision).toBe("block");
  });
});

describe("safeDisplayText", () => {
  it("removes control characters and bounds the displayed text", () => {
    expect(safeDisplayText("rm\n-rf ./x")).toBe("rm -rf ./x");
    expect(safeDisplayText("abcdef", 5)).toBe("abcd…");
  });
});
