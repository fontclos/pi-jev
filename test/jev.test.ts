import { describe, expect, it, vi } from "vitest";
import { OpenRouterJevAdapter, redactForDecision } from "../src/jev.js";

function response(answers: unknown, status = 200): Response {
  return new Response(JSON.stringify({ answers }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OpenRouterJevAdapter", () => {
  it("sends minimal action state to the Jev Decisions endpoint and parses typed answers", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      response({
        safe_to_run: { type: "noul", noul: 0.99 },
        policy_violation: { type: "noul", noul: 0.01 },
      }),
    );
    const adapter = new OpenRouterJevAdapter("test-key", undefined, 4000, fetchImpl, "Run local tests");

    const result = await adapter.decide({
      toolName: "bash",
      policyReason: "not allowlisted",
      action: "npm test",
    });

    expect(result.outcome).toBe("allow");
    expect(result.probabilities).toEqual({ safeToRun: 0.99, policyViolation: 0.01 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://openrouter.ai/api/alpha/decisions");

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-key" });
    const payload = JSON.parse(String(init?.body)) as {
      model: string;
      state: { policy: string; tool: string; action: string; task: string };
      questions: Record<string, { type: string }>;
    };
    expect(payload.model).toBe("typesafe/jev-1.13");
    expect(payload.state).toMatchObject({ tool: "bash", action: "npm test", task: "Run local tests" });
    expect(payload.state.policy).toContain("untrusted data");
    expect(payload.questions.safe_to_run?.type).toBe("noul");
  });

  it("requires explicit task scope before a high safe score can auto-allow", async () => {
    const adapter = new OpenRouterJevAdapter(
      "test-key",
      undefined,
      4000,
      vi.fn(async () => response({
        safe_to_run: { type: "noul", noul: 0.99 },
        policy_violation: { type: "noul", noul: 0.01 },
      })),
    );

    const result = await adapter.decide({
      toolName: "bash",
      policyReason: "not allowlisted",
      action: "npm test",
    });
    expect(result.outcome).toBe("review");
    expect(result.reason).toContain("task scope");
  });

  it("redacts OpenRouter keys and bearer tokens before sending action text", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { state: { action: string } };
      expect(payload.state.action).toContain("[REDACTED]");
      expect(payload.state.action).not.toContain("sk-or-v1-secret-example");
      return response({
        safe_to_run: { type: "noul", noul: 0.5 },
        policy_violation: { type: "noul", noul: 0.2 },
      });
    });
    const adapter = new OpenRouterJevAdapter("test-key", undefined, 4000, fetchImpl);

    await adapter.decide({
      toolName: "bash",
      policyReason: "not allowlisted",
      action: "curl -H 'Authorization: Bearer secret-token' sk-or-v1-secret-example",
    });
  });

  it("routes ambiguous scores to human review", async () => {
    const adapter = new OpenRouterJevAdapter(
      "test-key",
      undefined,
      4000,
      vi.fn(async () => response({
        safe_to_run: { type: "noul", noul: 0.55 },
        policy_violation: { type: "noul", noul: 0.2 },
      })),
    );

    expect((await adapter.decide({ toolName: "bash", policyReason: "x", action: "npm test" })).outcome)
      .toBe("review");
  });

  it("blocks on a strong policy-violation score", async () => {
    const adapter = new OpenRouterJevAdapter(
      "test-key",
      undefined,
      4000,
      vi.fn(async () => response({
        safe_to_run: { type: "noul", noul: 0.01 },
        policy_violation: { type: "noul", noul: 0.99 },
      })),
    );

    expect((await adapter.decide({ toolName: "bash", policyReason: "x", action: "git push --force" })).outcome)
      .toBe("block");
  });

  it("rejects invalid probabilities", async () => {
    const adapter = new OpenRouterJevAdapter(
      "test-key",
      undefined,
      4000,
      vi.fn(async () => response({
        safe_to_run: { type: "noul", noul: 1.5 },
        policy_violation: { type: "noul", noul: 0 },
      })),
    );

    await expect(adapter.decide({ toolName: "bash", policyReason: "x", action: "npm test" }))
      .rejects.toThrow("Invalid Jev probability");
  });

  it("does not include gateway response bodies in errors", async () => {
    const adapter = new OpenRouterJevAdapter(
      "test-key",
      undefined,
      4000,
      vi.fn(async () => new Response("request leaked", { status: 500 })),
    );

    await expect(adapter.decide({ toolName: "bash", policyReason: "x", action: "npm test" }))
      .rejects.toThrow("HTTP 500");
  });
});

describe("redactForDecision", () => {
  it("redacts secret-like values and removes control characters", () => {
    const result = redactForDecision("sk-or-v1-secret-example\nBearer secret-token API_KEY=secret-value");
    expect(result).not.toContain("sk-or-v1-secret-example");
    expect(result).not.toContain("secret-token");
    expect(result).not.toContain("secret-value");
    expect(result).toContain("[REDACTED]");
  });
});
