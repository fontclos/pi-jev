# pi-jev

A Pi coding-agent extension exploring typed decision checks in the agent loop, inspired by the Jev engineering approach. The first milestone is a policy-backed gate for tool calls.

> **Status:** Early implementation. The local gate and its tests are scaffolded; the Jev service adapter is not implemented yet.

## Goal

Let Pi remain responsible for reasoning and code changes while a separate decision layer handles narrow control decisions. Start with one: whether a requested tool call may run, needs human approval, or should be blocked.

This project is an integration and evaluation effort. It does not reimplement Jev or claim affiliation with Jev or TypeSafe AI.

## Current implementation

The extension listens to Pi's pre-execution `tool_call` event.

- Allows Pi's `read`, `grep`, `find`, and `ls` tools.
- Allows only a small exact allowlist of read-only shell commands.
- Asks for approval before other shell commands, file writes/edits, and unknown tools.
- Blocks approval-required actions when no approval UI is available, when the user declines, or when the dialog errors.
- Blocks empty shell commands.

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

## MVP direction

1. Verify Pi's extension hook and approval behavior against supported versions.
2. Keep deterministic policy checks ahead of model-based judgments.
3. Add a Jev adapter that accepts and validates a typed `allow`, `ask`, or `block` result.
4. Add request timeouts, confidence handling, data minimization, and a safe fallback.
5. Evaluate false allows, false blocks, approval rates, and latency before widening automation.

The first Jev adapter should be optional and replaceable with a fake adapter in offline tests.

## Safety rules

- Deterministic deny rules must run before any model-based judgment.
- A model decision cannot override a hard deny.
- Timeout, malformed output, missing configuration, or low confidence must never silently become `allow`; they route to human review or block.
- Secrets, full prompts, and unrelated file contents must not be sent to the decision service.
- The extension is **not a sandbox**. Pi extensions run with the permissions of the Pi process. Use OS-level isolation when you need a security boundary.
- The gate must not execute commands itself; Pi remains the tool executor.
- Pi extension handlers run in load order; other extensions may also affect tool calls. Do not treat this extension as the sole security control in a multi-extension setup.

## Proposed architecture

```text
Pi tool call
  -> normalize minimal action metadata
  -> deterministic policy
  -> decision adapter (fake | Jev)
  -> validate typed result and confidence
  -> allow | ask user | block
```

Keep Jev-specific request and response handling behind an adapter so policy and extension behavior can be tested without network access.

### Initial policy shape

- **Allow:** only explicitly supported read-only actions.
- **Ask:** ambiguous, potentially destructive, or low-confidence actions.
- **Block:** malformed calls, explicit deny rules, or requests that cannot be reviewed safely.

Exact command classification and thresholds remain open design decisions. Do not make universal shell-safety claims based on string matching.

## Milestones

### 0. Verify interfaces and write the contract
- Confirm Pi hook, blocking, UI, and supported-version behavior.
- Confirm the Jev API shape, authentication requirements, timeout behavior, and data sent.
- Specify typed decision results, policy precedence, and redaction rules.

**Exit:** a short design note and a reviewed decision schema.

### 1. Local extension and test seam — in progress
- TypeScript project and minimal Pi extension are in place.
- Conservative allowlist and approval gate are implemented.
- Unit tests cover core classifications and approval outcomes.
- Next: run type checks and tests in CI, then verify behavior in Pi.

**Exit:** extension loads in Pi; tests pass without credentials or network access.

### 2. Decision adapter
- Add a fake adapter for offline tests.
- Implement the optional Jev service adapter after verifying its API contract.
- Bound request size and latency; avoid sending secrets and unnecessary context.

**Exit:** contract tests cover valid, malformed, uncertain, delayed, and failed responses.

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
  extension.ts
  guard.ts
  policy.ts
test/
  guard.test.ts
  policy.test.ts
```

## Acceptance criteria for the first gate

- Pi loads the extension using the documented extension mechanism.
- Exact allowlisted actions pass without prompting.
- Other shell commands, file mutations, and unknown tools require confirmation.
- Calls are blocked when review is unavailable or fails.
- Tests cover policy outcomes, approval, decline, and UI failure.
- Documentation clearly states that this gate does not sandbox Pi.

## References

- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi security guidance](https://pi.dev/docs/latest)
- Jev engineering reference: [engineering for coding agents](https://www.jevtypesafeai.com/jev/engineering-for-coding-agents)
