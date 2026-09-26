# pi-jev

A Pi coding-agent extension that adds typed decision checks to the agent loop, inspired by the Jev engineering approach. The first goal is a policy-backed gate for tool calls.

> **Status:** Project plan. No implementation is included yet.

## Goal

Let Pi stay responsible for reasoning and code changes while a separate decision layer helps with narrow control decisions. Start with one high-value decision: whether a requested tool call may run, needs human approval, or should be blocked.

This project is an integration and evaluation effort. It does not reimplement Jev or claim affiliation with Jev or TypeSafe AI.

## MVP

Build a TypeScript Pi extension that:

1. Intercepts a tool call before execution.
2. Applies deterministic policy checks first.
3. Sends a minimal, redacted description of the proposed action to a decision adapter.
4. Accepts only a typed `allow`, `ask`, or `block` result.
5. Allows safe actions, pauses for human review when required, and blocks prohibited actions.
6. Records a redacted decision trace for troubleshooting.

The decision adapter should start with a fake implementation for tests, then gain an optional Jev-backed implementation once the API contract and authentication flow are verified.

## Safety rules

- Deterministic deny rules run before any model-based judgment.
- A model decision cannot override a hard deny.
- Timeout, malformed output, missing configuration, or low confidence must never silently become `allow`; they route to human review or block.
- Secrets, full prompts, and unrelated file contents must not be sent to the decision service.
- The extension is **not a sandbox**. Pi extensions run with the permissions of the Pi process. Users who need isolation should run Pi in an OS-level sandbox or container.
- The gate must not execute commands itself; Pi remains the tool executor.

## Proposed architecture

```text
Pi tool call
  -> normalize action metadata
  -> deterministic policy
  -> decision adapter (fake | Jev)
  -> validate typed result and confidence
  -> allow | ask user | block
  -> redacted audit event
```

Keep the Jev-specific request/response format behind an adapter so policy and extension behavior can be tested without a network connection.

### Initial policy shape

- **Allow:** clearly read-only, in-scope actions that pass deterministic rules and the decision threshold.
- **Ask:** ambiguous, potentially destructive, or low-confidence actions.
- **Block:** explicit deny rules, invalid decisions, or actions the configured policy forbids.

Exact command classification and thresholds are open design decisions. Do not ship universal shell safety claims based only on string matching.

## Milestones

### 0. Verify interfaces and write the contract
- Confirm the supported Pi extension event and blocking behavior against the installed Pi SDK version.
- Confirm the Jev API shape, authentication requirements, timeout behavior, and data sent.
- Specify typed decision results, policy precedence, and redaction rules.

**Exit:** a short design note and a reviewed decision schema.

### 1. Extension skeleton and test seam
- Set up TypeScript, linting, tests, and a minimal Pi extension.
- Add a decision-adapter interface and deterministic fake adapter.
- Add structured, redacted decision logging.

**Exit:** extension loads in Pi; unit tests run without credentials or network access.

### 2. Tool-call gate
- Normalize tool name and relevant arguments.
- Apply hard deny/allow rules before consulting the adapter.
- Implement allow / ask / block handling and safe behavior for errors and low confidence.

**Exit:** integration tests prove blocked calls never execute and ambiguous calls require approval.

### 3. Jev adapter
- Implement the service adapter behind configuration.
- Bound request size and latency; avoid sending secrets and unnecessary context.
- Keep a deterministic fallback path when the service is unavailable.

**Exit:** contract tests cover valid, malformed, uncertain, delayed, and failed responses.

### 4. Evaluation and release
- Build a curated test corpus of benign, destructive, ambiguous, and injection-style tool calls.
- Measure false allows, false blocks, approval rate, latency, and failure behavior.
- Document setup, policy configuration, known limitations, and uninstall/disable steps.
- Publish only after the safety and compatibility checks pass.

**Exit:** documented results, passing tests, and a tagged pre-release.

### Later work (out of MVP)
- Model routing.
- Repeated-action / no-progress detection.
- Context relevance scoring and compaction suggestions.

Each later feature should be independently configurable and evaluated before being enabled by default.

## Initial repository layout

```text
src/
  extension.ts
  policy/
  decision/
  logging/
test/
  unit/
  integration/
docs/
  design.md
  evaluation.md
```

## Acceptance criteria for the MVP

- Pi loads the extension using the documented extension mechanism.
- Hard-denied actions never reach tool execution.
- The fake adapter makes the full gate testable offline.
- Jev failure, timeout, malformed data, and low confidence cannot silently allow an action.
- The user can distinguish allow, approval-required, and blocked outcomes.
- Decision logs omit secrets and unrelated prompt or file content.
- Tests report false-allow and false-block counts on the curated corpus.
- Documentation clearly states that this gate does not sandbox Pi.

## Open decisions

- Minimum supported Pi version and package format.
- Whether to gate all tools or begin with shell and file-mutating tools.
- Jev API request contract, thresholds, and data minimization.
- Exact approval UI and behavior in interactive versus unattended sessions.
- License and release target.

## References

- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi security guidance](https://pi.dev/docs/latest)
- Jev engineering reference: [engineering for coding agents](https://www.jevtypesafeai.com/jev/engineering-for-coding-agents)
