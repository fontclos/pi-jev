# Decision contract

Pi is the executor. pi-jev handles `tool_call` and either returns no result (Pi may run the call) or `{ block: true, reason }` (Pi refuses it). The gate never runs a command itself.

| Stage | Input | Result |
| --- | --- | --- |
| Local policy | Tool name and arguments | Exact read-only calls pass; empty shell calls and recognized high-impact shell signatures block; all other calls require review. |
| Jev | Non-allowlisted `bash` command, policy, explicit task scope | Two typed `noul` probabilities: `safe_to_run` and `policy_violation`. |
| Thresholds | Both validated probabilities in [0, 1] | Violation ≥ 0.95 blocks. Safe ≥ 0.95 and violation ≤ 0.05 allows only with a nonempty explicit task scope. Other results request human review. |
| Human | Review result, no key, timeout, API error, or malformed response | Approval passes; decline, missing UI, dialog error, or an input over 16,000 displayed characters blocks. The dialog shows the exact JSON-escaped tool input. |

Local blocks precede Jev. File mutations and unknown tools require human approval and are never automatically approved by Jev. A Jev block is final for that call.

The remote state contains a fixed policy, tool name, a one-line command summary capped at 240 characters, and the explicit `PI_JEV_TASK` text capped at 240 characters. It does not contain the conversation, file contents, tool output, or the full working tree. If a command or task scope exceeds 240 normalized characters, a command contains control characters, or common key or token forms are detected, no remote request is made and the call requires human review. Arbitrary embedded credentials cannot be detected reliably. Avoid setting a task scope or submitting commands that contain secrets.

The adapter validates the response shape and both probabilities. A non-2xx status, timeout, missing answer, invalid type, or out-of-range number is an error. Gateway response bodies are not included in errors. Network and schema failures never become automatic approval.

The local shell signatures are narrow defense in depth, not a shell parser. Quoting, aliases, scripts, and custom tools can escape those signatures. The extension is not an isolation boundary, and Pi extensions share the Pi process permissions.
