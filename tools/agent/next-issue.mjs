#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureDirFor, resolveAiDir } from "../lib/workspace.mjs";

const root = process.cwd();
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1];
  return fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const readyLabel = argValue("--label", "agent:ready");
const inProgressLabel = argValue("--in-progress-label", "agent:in-progress");
const repo = argValue("--repo", undefined);
const limit = Number(argValue("--limit", "30"));
const dryRun = hasFlag("--dry-run");
const noClaim = hasFlag("--no-claim");

function gh(ghArgs) {
  const finalArgs = repo ? [...ghArgs, "--repo", repo] : ghArgs;
  const result = spawnSync("gh", finalArgs, { cwd: root, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`gh ${finalArgs.join(" ")} failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return result.stdout;
}

function listReadyIssues() {
  const out = gh([
    "issue",
    "list",
    "--label",
    readyLabel,
    "--state",
    "open",
    "--limit",
    String(limit),
    "--json",
    "number,title,body,labels,url,createdAt",
  ]);
  const issues = JSON.parse(out);
  // Board order approximation: oldest ready issue first (FIFO).
  return issues.sort((a, b) => a.number - b.number);
}

function deriveSuggestedRisk(issue) {
  const fromLabel = issue.labels?.find((label) => label.name?.startsWith("risk:"))?.name;
  if (fromLabel) return fromLabel;
  const body = String(issue.body ?? "").toLowerCase();
  const match = body.match(/suggested risk[\s\S]{0,80}?\b(low|medium|high)\b/);
  return match ? `risk:${match[1]}` : "risk:unknown";
}

function writePrdSeed(issue) {
  const ai = resolveAiDir(root);
  const seedPath = path.join(root, ai, "workspace/prds", `issue-${issue.number}.md`);
  ensureDirFor(seedPath);
  const suggestedRisk = deriveSuggestedRisk(issue);
  const content = `# Discovery seed: issue #${issue.number}

Source: ${issue.url}
Suggested risk: ${suggestedRisk}
Claimed at: ${new Date().toISOString()}

## Title

${issue.title}

## Issue body (treat as PRD seed)

${String(issue.body ?? "").trim() || "_No body provided._"}

---
Next: run /discovery to refine, then /plan. Apply the early risk gate from the agent-runtime skill.
`;
  fs.writeFileSync(seedPath, content);
  return { seedPath, suggestedRisk };
}

function claim(issue) {
  gh(["issue", "edit", String(issue.number), "--add-label", inProgressLabel, "--remove-label", readyLabel]);
}

function main() {
  if (dryRun && spawnSync("gh", ["--version"], { encoding: "utf8" }).status !== 0) {
    console.log(JSON.stringify({ dryRun: true, gh: "not available", action: "would list and claim next ready issue" }, null, 2));
    return;
  }

  const issues = listReadyIssues();
  if (issues.length === 0) {
    console.log(JSON.stringify({ status: "idle", reason: `no open issues with label ${readyLabel}` }, null, 2));
    process.exit(3);
  }

  const issue = issues[0];

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      selected: { number: issue.number, title: issue.title, url: issue.url },
      suggestedRisk: deriveSuggestedRisk(issue),
      wouldClaim: !noClaim,
    }, null, 2));
    return;
  }

  const { seedPath, suggestedRisk } = writePrdSeed(issue);
  if (!noClaim) claim(issue);

  console.log(JSON.stringify({
    status: "claimed",
    issue: issue.number,
    title: issue.title,
    url: issue.url,
    suggestedRisk,
    prdSeed: path.relative(root, seedPath),
    claimed: !noClaim,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`[agent:next] ${error.message}`);
  process.exit(1);
}
