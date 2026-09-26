import { describe, expect, it, vi } from "vitest";
import { gateToolCall } from "../src/guard.js";

describe("gateToolCall", () => {
  it("passes an allowlisted command without prompting", async () => {
    const confirm = vi.fn(async () => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "pwd" } },
      { hasUI: true, confirm },
    );

    expect(result).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("passes an approved shell command", async () => {
    const confirm = vi.fn(async () => true);
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm install" } },
      { hasUI: true, confirm },
    );

    expect(result).toBeUndefined();
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[1]).toContain("npm install");
  });

  it("blocks a declined request", async () => {
    const result = await gateToolCall(
      { toolName: "write", input: { path: "src/app.ts" } },
      { hasUI: true, confirm: async () => false },
    );

    expect(result?.block).toBe(true);
  });

  it("blocks if approval UI is unavailable", async () => {
    const result = await gateToolCall(
      { toolName: "bash", input: { command: "npm install" } },
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
