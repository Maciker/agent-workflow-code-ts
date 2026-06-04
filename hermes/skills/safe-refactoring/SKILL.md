---
name: safe-refactoring
description: Use when changing structure without changing external behavior.
---

# Safe Refactoring

Refactoring changes structure, not behavior.

## Rules

- Characterize existing behavior before changing risky code.
- Prefer small reversible steps.
- Keep tests green after each step.
- Do not mix refactor and feature behavior in the same commit.
- Use parallel change for public API migrations.

## Stop conditions

Stop and ask for approval if:

- A public contract must change.
- Tests are missing for risky behavior.
- The refactor expands beyond the approved plan.
