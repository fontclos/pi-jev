# pi-jev

A Pi coding-agent extension that gates tool calls with a local policy, an optional Jev decision, and human review. Pi still executes the tools. This project is independent of Pi, Jev, TypeSafe AI, and OpenRouter.

## Status

The MVP gate, typed Jev adapter, offline evaluation corpus, and Pi loader smoke test are implemented. CI runs type checking, unit tests, offline evaluation, and the loader smoke test. A live Jev run still needs to be performed with an OpenRouter key in the local environment before release.

## Install and run

Requires Node.js 22.19 or newer.

```sh
npm install
npm run check
pi --extension ./src/extension.ts
```

Pi can also install the repository as a package:

```sh
pi install git:github.com/fontclos/pi-jev
```

To enable Jev, export these in the shell that launches Pi:

```sh
export OPENROUTER_API_KEY='<your key>'
export PI_JEV_TASK='Run local tests and inspect repository status'
pi --extension ./src/extension.ts
```

`PI_JEV_TASK` describes the authorized work and is sent to Jev. Keep it narrow and free of secrets. Without it, Jev can block a command, but cannot automatically approve one. Without `OPENROUTER_API_KEY`, non-allowlisted shell commands go directly to human review. `JEV_MODEL` optionally overrides the default `typesafe/jev-1.13`. The extension does not load `.env` automatically.

Use a newly rotated key if one has been pasted into a chat or other shared surface. Never commit credentials or add them to CI logs.

## Decision behavior

| Call | Outcome |
| --- | --- |
| `read`, `grep`, `find`, `ls` | Allowed locally. |
| Exact `pwd`, `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git log --oneline -5` | Allowed locally. |
| Empty shell command or locally recognized high-impact shell command | Blocked before Jev. |
| Other shell command, with Jev and explicit task scope | Jev may allow or block at 0.95 thresholds; otherwise human review. |
| Other shell command, without Jev or task scope | Human review. |
| `write`, `edit`, or unknown tool | Human review; Jev cannot approve it. |
| Review with no UI, declined approval, or failed dialog | Blocked. |

The local high-impact signatures include force pushes, hard resets, recursive forced removal, privilege escalation, disk formatting, shutdown, and remote scripts piped to a shell. They are deliberately limited and can be evaded by shell syntax. This extension is not a sandbox or a complete command parser. Pi extensions run with the Pi process permissions, and other extensions can affect tool calls.

Jev receives the tool name, a short redacted command summary, a fixed policy, and the explicit task scope. It does not receive the full conversation or repository files. Commands or task scopes with recognized credential forms go to human review without a remote request. Arbitrary secrets cannot be detected reliably, so keep them out of commands that may be evaluated remotely.

See [the decision contract](docs/decision-contract.md) for response validation, policy precedence, and failure behavior.

## Evaluation

```sh
npm run evaluate:offline
npm run smoke:pi
```

The offline evaluator checks the curated cases in `eval/cases.json`. The smoke test loads the package manifest through Pi's own extension loader and exercises its registered `tool_call` hook without a model key.

To run the same corpus against Jev, set `OPENROUTER_API_KEY` locally and use:

```sh
npm run evaluate:live
```

The live runner uses a fixed, narrow task scope; it prints case IDs, outcomes, elapsed time, false allows, false blocks, review rate, and contract errors. It never executes the fixture commands. Model outcomes are probabilistic, so inspect the case results and revise the policy before relying on automatic approvals.

## Project layout

- `src/policy.ts`: deterministic local policy.
- `src/jev.ts`: OpenRouter Decisions adapter and response validation.
- `src/guard.ts`: local policy, Jev, and human review routing.
- `src/extension.ts`: Pi event registration.
- `test/`: unit tests.
- `eval/cases.json` and `scripts/evaluate.ts`: offline and optional live evaluation.
- `scripts/smoke-pi.ts`: Pi loader smoke test.

## Future work

Model routing, repeated-action detection, and context relevance are separate extensions to this gate. They need independent policies and evaluation before they are enabled.

## References

- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [OpenRouter: Gate agent tool calls with Jev](https://openrouter.ai/docs/cookbook/building-agents/gate-tool-calls-with-jev)
