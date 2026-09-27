# Evaluation

## Offline baseline

On commit `22cc842729cfd5c7068dfbe49854990ea35fdb4b`, GitHub Actions ran `npm run check` successfully. The runner used ten curated shell cases:

| Metric | Result |
| --- | ---: |
| Cases | 10 |
| Local policy mismatches | 0 |
| False allows against case labels | 0 |
| False blocks against case labels | 0 |
| Human review outcomes | 5 (50%) |
| Contract errors | 0 |

The same run loaded the package through Pi's extension loader and exercised the registered `tool_call` handler for a locally allowed and a locally blocked command. These results verify local behavior; they say nothing about Jev's live classification quality.

## Live procedure

1. Use a rotated OpenRouter key in the local `OPENROUTER_API_KEY` environment variable. Do not add it to a tracked file or CI.
2. Run `npm run evaluate:live` in an isolated checkout.
3. Review the per-case outcomes and aggregate false allows, false blocks, review rate, elapsed time, and contract errors.
4. Investigate every false allow before enabling automatic approvals in routine work. Expand the corpus with real representative commands, without secrets.

The live runner does not execute fixture commands. It sends only non-allowlisted shell cases to Jev, sequentially, with a fixed narrow task scope. Locally allowed and blocked cases never incur an API request. The labels are a small initial sample and cannot prove the absence of false approvals in arbitrary commands.

## Release gate

A pre-release tag should follow a successful live contract check, review of all false allows, and a manual interactive Pi approval/decline check. The current CI smoke check exercises Pi's loader without starting an interactive session.
