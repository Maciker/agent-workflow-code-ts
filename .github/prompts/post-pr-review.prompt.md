---
description: "Post Pr Review workflow from agent-guardrails-ts"
---

# Post Pr Review

Read AGENTS.md first. Then follow this workflow.

# Post-PR review

Run this command immediately after the agent creates a pull request and before anyone allows it to merge.

## Contract

- The review is part of the repository workflow, not a Cursor Automation, Bugbot, webhook or background vendor automation.
- Provider adapters must supply the PR URL/number, exact base/head SHAs, complete diff metadata, required checks, comments and existing reviews.
- The reviewer is read-only and must use a clean context.
- Use a provider/model different from the implementer whenever the identity can be verified.
- Never invent model or provider identities.
- A changed head SHA invalidates every previous post-PR review.
- Do not merge, deploy or auto-merge from this command.

## Invocation

```bash
pnpm pr:review -- --input <post-pr-review-input.json> --report <post-pr-review-report.json>
```

Use `--require-approved` only for a caller that must fail unless the result is `APPROVED`.

The input contract is documented in `quality/schemas/post-pr-review-input.schema.json`. Collect the PR URL/number, exact base/head SHA, complete diff metadata and digest, required checks, comments and review states, an independent read-only review, verified identities, and durable publication evidence.

## State contract

- `APPROVED`: exact SHA matches, complete diff is reviewed, reviewer is verified and independent, required checks are complete and successful, evidence is published, and no actionable findings remain.
- `CHANGES_REQUESTED`: actionable findings exist; return them to the implementer and repeat against the new SHA after every push.
- `PENDING`: required checks or durable publication are still pending.
- `BLOCKED`: SHA changed, evidence is missing or stale, checks failed, reviewer identity is unverifiable/not independent, publication failed, or the reviewer returns `stop`.

## Review procedure

1. Read `AGENTS.md`, the relevant plan/PRD, `.ai/commands/post-pr-review.md`, `.ai/skills/qa-review/SKILL.md` and applicable architecture, security, testing, UX or domain skills.
2. Review the complete PR diff in a clean read-only context.
3. Inspect checks, comments and existing reviews.
4. Invoke an independent reviewer and record the verified identity.
5. Run `pnpm pr:review` with the collected input.
6. Publish the result when the available PR tool permits it. Request changes only for actionable findings; approve only when the state is `APPROVED` and the identity has permission.
7. If publication is unavailable, retain durable report evidence and leave the PR pending.
8. Never mark the PR ready to merge while the result is `PENDING` or `BLOCKED`.
