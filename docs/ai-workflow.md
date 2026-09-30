# AI workflow

## Flow

```text
discovery -> plan -> approve -> execute -> review -> quality -> PR -> post-PR review
```

## Artifacts

| Phase | Owner | Artifact |
| --- | --- | --- |
| Discovery | Human + debater | `.ai/workspace/prds/*.md` |
| Plan | planner | `.ai/workspace/plans/*.md` |
| Approval | Human | approved checklist |
| Execute | executor | code + commits + summary |
| Review | reviewer / QA agents | `.ai/workspace/reviews/*.md` |
| Quality | scripts / CI | deterministic checks |
| PR | Cursor / provider adapter | pull request URL + exact base/head SHA |
| Post-PR review | independent read-only reviewer | `.ai/workspace/pr-reviews/post-pr-review.json` + durable PR evidence |

## Rule

Agents work in small slices. After each slice, keep the validated output and discard noisy context.
