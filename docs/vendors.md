# Vendor adapters

`.ai/` is the canonical source for agents, commands, skills, MCP and workspace conventions. Vendor-specific directories are generated projections.

## Supported vendors

| Vendor | Generated paths | Purpose |
| --- | --- | --- |
| Cursor | `.cursor/rules`, `.cursor/agents`, `.cursor/skills`, `.cursor/mcp.json` | Native rules, subagents, skills and MCP config |
| Codex | `.codex/config.toml`, `.codex/agents`, `.codex/hooks.json`, `.codex/AGENTS.md`, `.agents/skills` | Project config, custom agents, hooks, AGENTS contract and portable skills |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions`, `.github/prompts` | Repository instructions, path-specific instructions and reusable prompts |

## Golden rule

Do not edit generated vendor files by hand. Edit `.ai/`, `AGENTS.md`, `docs/`, or `quality/`, then run:

```bash
pnpm ai:sync
pnpm vendors:check
```

## Why projections instead of one shared format?

Each vendor has different native primitives:

- Cursor has project rules, subagents, skills and MCP config.
- Codex has `AGENTS.md`, project config, custom agents, hooks and agent skills.
- GitHub Copilot has repository instructions, path-specific instructions and prompt files.

The canonical workflow stays stable in `.ai/`; vendor folders optimize the developer experience for each tool.

## Checks

`pnpm vendors:check` verifies that:

- Cursor agents match `.ai/agents`.
- Cursor and portable skills match `.ai/skills`.
- required Cursor rules exist.
- required GitHub instructions and prompts exist.
- required Codex config, custom agents, hooks and portable skills exist.
- generated files do not contain common literal token patterns.

## Codex hardening

Run `pnpm quality:codex` to validate Codex custom agents, hooks and skill-budget size. See `docs/codex-hardening.md`.
