Run one iteration of the unattended 24/7 agent loop. Follow the `agent-runtime` skill.

Issue: $ARGUMENTS (optional; defaults to the next `agent:ready` issue on the board)

Steps:
- Claim the task with `pnpm agent:next` (or use the issue passed as argument).
- Use the PRD seed under `.ai/workspace/prds/` as input to `/discovery` and `/plan`.
- Apply the early risk gate from the `agent-runtime` skill. Stop for human input on
  medium/high risk, ambiguity, or any stop condition.
- For low risk, implement the approved plan with the `executor` role and strict TDD.
- Verify with `pnpm loop -- --level full`, then `pnpm qa:run -- --gate` using a different
  QA model.
- Run `pnpm agent:preflight` to derive the final `risk:*` label and route.
- Push the branch, open a PR that closes the issue, and apply the `risk:*` label.

Rules:
- One issue at a time. Do not merge. Do not grow baselines. Do not edit generated vendor files.
- If anything invalidates the plan, set `agent:needs-human` and stop.
