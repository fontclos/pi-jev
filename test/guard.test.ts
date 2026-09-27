import { describe, expect, it, vi } from "vitest";
import type { DecisionAdapter } from "../src/decision.js";
import { gateToolCall } from "../src/guard.js";

describe("gateToolCall", () => {
  it("passes an allowlisted command without prompting", async () => {
    const confirm = vi.fn(async (_title: string, _message: string) => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "pwd" } },
      { hasUI: true, confirm },
    );

    expect(result).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("lets Jev approve a clearly safe shell command", async () => {
    const decisionAdapter: DecisionAdapter = {
      decide: async () => ({
        outcome: "allow",
        reason: "clear safe result",
        probabilities: { safeToRun: 0.99, policyViolation: 0.01 },
      }),
    };
    const confirm = vi.fn(async (_title: string, _message: string) => false);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm test" } },
      { hasUI: true, confirm, decisionAdapter },
    );

    expect(result).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps a local block even if Jev would allow it", async () => {
    const decide = vi.fn(async () => ({
      outcome: "allow" as const,
      reason: "safe",
      probabilities: { safeToRun: 1, policyViolation: 0 },
    }));
    const confirm = vi.fn(async (_title: string, _message: string) => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "git push --force" } },
      { hasUI: true, confirm, decisionAdapter: { decide } },
    );

    expect(result?.block).toBe(true);
    expect(decide).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("blocks when Jev identifies a clear violation outside local rules", async () => {
    const decide = vi.fn(async () => ({
      outcome: "block" as const,
      reason: "clear policy violation",
      probabilities: { safeToRun: 0.01, policyViolation: 0.99 },
    }));
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm publish" } },
      { hasUI: true, confirm: async () => true, decisionAdapter: { decide } },
    );

    expect(result?.block).toBe(true);
    expect(decide).toHaveBeenCalledOnce();
  });

  it("routes uncertain Jev results to human approval", async () => {
    const decisionAdapter: DecisionAdapter = {
      decide: async () => ({
        outcome: "review",
        reason: "uncertain",
        probabilities: { safeToRun: 0.55, policyViolation: 0.2 },
      }),
    };
    const confirm = vi.fn(async (_title: string, _message: string) => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm test" } },
      { hasUI: true, confirm, decisionAdapter },
    );

    expect(result).toBeUndefined();
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[1]).toContain("uncertain");
  });

  it("falls back to human review when Jev fails", async () => {
    const decisionAdapter: DecisionAdapter = {
      decide: async () => { throw new Error("network unavailable"); },
    };
    const confirm = vi.fn(async (_title: string, _message: string) => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm test" } },
      { hasUI: true, confirm, decisionAdapter },
    );

    expect(result).toBeUndefined();
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[1]).toContain("Jev could not evaluate");
  });

  it("never sends file mutations to Jev for automatic approval", async () => {
    let called = false;
    const decisionAdapter: DecisionAdapter = {
      decide: async () => {
        called = true;
        return {
          outcome: "allow",
          reason: "allow",
          probabilities: { safeToRun: 1, policyViolation: 0 },
        };
      },
    };
    const result = await gateToolCall(
      { toolName: "write", input: { path: "src/app.ts" } },
      { hasUI: true, confirm: async () => false, decisionAdapter },
    );

    expect(result?.block).toBe(true);
    expect(called).toBe(false);
  });

  it("shows the full escaped command to a human reviewer", async () => {
    const confirm = vi.fn(async (_title: string, _message: string) => false);
    await gateToolCall(
      { toolName: "bash", input: { command: "echo first\necho second" } },
      { hasUI: true, confirm },
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[1]).toContain("echo first\\necho second");
  });

  it("blocks tool input too large for complete review", async () => {
    const confirm = vi.fn(async (_title: string, _message: string) => true);
    const result = await gateToolCall(
      { toolName: "write", input: { path: "large.txt", content: "x".repeat(17_000) } },
      { hasUI: true, confirm },
    );

    expect(result?.block).toBe(true);
    expect(result?.reason).toContain("too large");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("blocks if approval UI is unavailable", async () => {
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm test" } },
      { hasUI: false },
    );

    expect(result?.block).toBe(true);
    expect(result?.reason).toContain("No approval UI");
  });

  it("blocks if the approval dialog fails", async () => {
    const result = await gateToolCall(
      { toolName: "edit", input: { path: "src/app.ts" } },
      { hasUI: true, confirm: async () => { throw new Error("dialog failed"); } },
    );

    expect(result?.block).toBe(true);
    expect(result?.reason).toContain("could not be completed");
  });
});
