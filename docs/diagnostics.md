# Diagnostics

Temporary diagnostic script for checking the guardrails package in a local environment.

Run from the repository root:

```bash
pnpm diagnostics
```

Or directly:

```bash
bash scripts/diagnostics/run-guardrails-check.sh
```

The log is written to:

```text
_diagnostics/guardrails-check-YYYYMMDD-HHMMSS.log
```

Useful environment flags:

```bash
RUN_INSTALL=0 RUN_FULL=0 bash scripts/diagnostics/run-guardrails-check.sh
RUN_QA_STRICT=1 bash scripts/diagnostics/run-guardrails-check.sh
```
