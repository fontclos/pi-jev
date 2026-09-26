# pi-jev

A Pi coding-agent extension exploring typed decision checks in the agent loop, inspired by the Jev engineering approach. The first milestone is a policy-backed gate for tool calls.

> **Status:** Early implementation. The local gate and optional OpenRouter Jev adapter are in place; behavior still needs validation in Pi and live Jev evaluation.

## Goal

Let Pi remain responsible for reasoning and code changes while a separate decision layer handles narrow control decisions. Start with one: whether a requested tool call may run, needs human approval, or should be blocked.

This project is an integration and evaluation effort. It does not reimplement Jev or claim affiliation with Jev or TypeSafe AI.

## Current implementation

The extension listens to Pi's pre-execution `tool_call` event.

- Allows Pi's `read`, `grep`, `find`, and `ls` tools.
- Allows only a small exact allowlist of read-only shell commands.
- For other shell commands, optionally asks Jev through OpenRouter; strong safe or violation scores map to allow/block, and uncertain results go to human review.
- Without a Jev key, or if the Jev request fails, shell commands require human approval.
- File writes/edits and unknown tools always require human approval; they are not sent to Jev for automatic approval.
- Blocks approval-required actions when no approval UI is available, when the user declines, or when the dialog errors.
- Blocks empty shell commands.

The Jev adapter sends only the tool name and a short, redacted command summary. It uses the Decisions endpoint and validates both probabilities. A real key is read from `OPENROUTER_API_KEY`; it is not stored in the repository or used by CI.

This is intentionally conservative. The exact shell allowlist is not a general shell parser and is not a sandbox. Treat this as an early prototype.

## Development

Requires Node.js 22.19 or newer.

```sh
npm install
npm run check
```

Load the extension in Pi from this repository:

```sh
pi --extension ./src/extension.ts
```

To use Jev, set `OPENROUTER_API_KEY` in the environment that starts Pi. The optional `JEV_MODEL` variable defaults to `typesafe/jev-1.13`. Copy `.env.example` as a local reference if helpful, but do not put a real key in a tracked file.

## Decision flow

```text
Pi tool call
  -> deterministic exact allowlist
  -> Jev for non-allowlisted shell commands (if configured)
  -> high-confidence allow/block, otherwise human review
  -> no key, timeout, malformed response, or API error: human review
```

The current thresholds require at least 0.95 confidence to allow or block. Anything else goes to human review. File mutations and unknown tools bypass Jev and always require a human.

## Safety rules

- Deterministic deny rules must run before any model-based judgment.
- A model decision cannot override a hard deny.
- Timeout, malformed output, missing configuration, or low confidence must never silently become `allow`; they route to human review or block.
- Secrets, full prompts, and unrelated file contents must not be sent to the decision service.
- The extension is **not a sandbox**. Pi extensions run with the permissions of the Pi process. Use OS-level isolation when you need a security boundary.
- The gate must not execute commands itself; Pi remains the tool executor.
- Pi extension handlers run in load order; other extensions may also affect tool calls. Do not treat this extension as the sole security control in a multi-extension setup.

## Milestones

### 0. Verify interfaces and write the contract — in progress
- Confirm Pi hook, blocking, UI, and supported-version behavior.
- Confirm the OpenRouter Jev Decisions request/response contract.
- Specify typed decision results, policy precedence, confidence thresholds, and redaction rules.

**Exit:** design note and a reviewed decision schema.

### 1. Local extension and test seam — implemented; CI validation pending
- TypeScript project, minimal Pi extension, conservative allowlist, and approval gate are in place.
- Offline tests cover local policy, Jev response validation, redaction, and approval outcomes.
- CI runs type checking and unit tests.

**Exit:** passing CI plus a smoke test in Pi.

### 2. Jev adapter — implemented; live evaluation pending
- Optional OpenRouter Decisions adapter uses `typesafe/jev-1.13`.
- Failures fall back to human approval.
- Next: validate actual provider behavior and evaluate representative command cases.

**Exit:** live contract checks and documented evaluation results.

### 3. Evaluation and release
- Build a curated test corpus of benign, destructive, ambiguous, and injection-style tool calls.
- Measure false allows, false blocks, approval rate, latency, and failure behavior.
- Document setup, policy configuration, known limitations, and disable steps.
- Publish only after compatibility and safety checks pass.

**Exit:** documented results, passing tests, and a tagged pre-release.

### Later work (out of MVP)

- Model routing.
- Repeated-action / no-progress detection.
- Context relevance scoring and compaction suggestions.

Each later feature should be independently configurable and evaluated before it is enabled by default.

## Initial repository layout

```text
src/
  decision.ts
  extension.ts
  guard.ts
  jev.ts
  policy.ts
test/
  guard.test.ts
  jev.test.ts
  policy.test.ts
```

## Acceptance criteria for the first gate

- Pi loads the extension using the documented extension mechanism.
- Exact allowlisted actions pass without prompting.
- Non-allowlisted shell commands are allowed/blocked only at high Jev confidence; uncertain and failed checks require approval.
- File mutations and unknown tools require confirmation.
- Secrets and unrelated prompt context are not sent to Jev.
- Calls are blocked when review is unavailable or fails.
- Tests cover policy outcomes, Jev parsing, redaction, approval, decline, and UI failure.
- Documentation clearly states that this gate does not sandbox Pi.

## References

- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi security guidance](https://pi.dev/docs/latest)
- [OpenRouter: Gate agent tool calls with Jev](https://openrouter.ai/docs/cookbook/building-agents/gate-tool-calls-with-jev)
