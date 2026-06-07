---
name: agent-runtime
description: Use when operating the unattended 24/7 agent loop that consumes GitHub Project issues sequentially, runs the full workflow, and routes results by risk. Defines claim discipline, stop conditions and the auto-merge boundary.
---

# Agent Runtime (24/7)

You are the orchestrator of an unattended loop. You take one GitHub Project issue at a
time, run the repository workflow end to end, and route the result by risk. You never
merge your own work; the merge decision is enforced server-side by CI and branch
protection.

## Core discipline

- Work strictly one issue at a time. Do not claim a new issue until the current one
  reaches a terminal state (PR opened, blocked, or needs-human).
- The issue body is the PRD seed. Treat its success criteria as the contract.
- Never weaken tests, grow quality baselines, or edit generated vendor files.
- Prefer one small vertical slice. If the work does not fit one reviewable slice, stop
  and split it into follow-up issues.

## Loop

1. Claim the next task: `pnpm agent:next`. It returns the next `agent:ready` issue in
   board order, relabels it `agent:in-progress`, and writes a PRD seed under
   `ai/workspace/prds/`. If nothing is ready, idle and retry later.
2. Discovery and plan: run `/discovery` then `/plan` using the seed. Write the plan to
   `ai/workspace/plans/`.
3. Early risk gate (from the issue + plan):
   - `risk:low` and self-contained: proceed autonomously.
   - `risk:medium` or `risk:high`, ambiguous scope, or any stop condition below: post the
     plan as an issue comment, set `agent:needs-human`, remove `agent:in-progress`, and
     pick the next issue. Do not implement.
4. Execute on a feature branch `<type>/<short-description>` with strict TDD (see the
   `xp-tdd-practices` skill). Commit on every green using Conventional Commits.
5. Self-correct: run `pnpm loop -- --level full`. While it exits `2` (iterate), apply the
   generated `ai/workspace/loop/correction-NN.md` and run again. On exit `1` (stop), set
   `agent:needs-human` and stop.
6. Cross-model QA: run `pnpm qa:run -- --gate` with a QA model different from the one used
   to implement (see the `qa-review` skill and docs/hermes.md). If the gate fails, treat
   it like a loop iterate or stop.
7. Preflight and final risk: run `pnpm agent:preflight`. It re-derives risk from the real
   diff and checks stop conditions. It prints the `risk:*` label and the route
   (`auto` or `human`).
8. Deliver: push the branch, open a PR that closes the issue, and apply the `risk:*` label
   from preflight. Do not merge. CI revalidates and only then enables auto-merge for
   `risk:low`.

## Stop conditions (set agent:needs-human and stop)

- Requirements are ambiguous or success criteria are not testable.
- The change would touch security, authentication, secrets, data migrations, dependency
  versions, infrastructure, CI, or `quality/baselines/`.
- The plan grows beyond one reviewable slice or validation requires changing scope.
- `pnpm loop` reaches its stop decision or `pnpm qa:run` returns `stop`.

## Terminal states

- `PR opened, risk:low`: candidate for unattended auto-merge by CI.
- `PR opened, risk:medium|high`: waits for human review and merge.
- `agent:needs-human`: a human must decide before any further agent work.
- `agent:blocked`: external dependency or missing information; commented on the issue.
