#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { writeJson } from "../quality/lib/findings.mjs";

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

const base = argValue("--base", "origin/main");
const head = argValue("--head", "HEAD");
const reportPath = argValue("--write-report", ".quality/agent-preflight.json");
const maxLowLines = Number(argValue("--max-low-lines", "120"));
const maxLowFiles = Number(argValue("--max-low-files", "8"));

// High-risk / stop-condition path patterns. Any match forces human review.
const HIGH_RISK_PATTERNS = [
  { re: /(^|\/)quality\/baselines\//, reason: "changes a quality baseline" },
  { re: /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/, reason: "changes dependencies" },
  { re: /(^|\/)\.github\/workflows\//, reason: "changes CI workflows" },
  { re: /(^|\/)azure\//, reason: "changes CI pipelines" },
  { re: /(^|\/)(Dockerfile|\.devcontainer\/)/, reason: "changes container/infra" },
  { re: /(^|\/)migrations?\//, reason: "changes database migrations" },
  { re: /\.sql$/, reason: "changes SQL" },
  { re: /(^|\/)(\.env|.*\.pem|.*\.key|secrets?(\.|\/)|credentials)/i, reason: "touches secrets or credentials" },
  { re: /(^|\/)(auth|security)\//i, reason: "touches authentication or security code" },
  { re: /(^|\/)(\.cursor|\.codex|\.hermes|\.agents)\//, reason: "edits generated vendor files directly" },
  { re: /(^|\/)\.github\/(prompts|instructions)\//, reason: "edits generated vendor files directly" },
];

function git(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`git ${gitArgs.join(" ")} failed: ${result.stderr || "unknown error"}`);
  }
  return result.stdout;
}

function changedFiles() {
  const out = git(["diff", "--name-only", `${base}...${head}`]).trim();
  return out ? out.split("\n").map((line) => line.trim()).filter(Boolean) : [];
}

function diffStats() {
  const out = git(["diff", "--numstat", `${base}...${head}`]).trim();
  let added = 0;
  let removed = 0;
  for (const line of out ? out.split("\n") : []) {
    const [a, r] = line.split("\t");
    if (a !== "-") added += Number(a) || 0;
    if (r !== "-") removed += Number(r) || 0;
  }
  return { added, removed, total: added + removed };
}

function readJsonSafe(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (!fs.existsSync(absolute)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return undefined;
  }
}

function classify(files, stats) {
  const reasons = [];
  let risk = "low";

  const highHits = [];
  for (const file of files) {
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.re.test(file)) highHits.push({ file, reason: pattern.reason });
    }
  }
  if (highHits.length > 0) {
    risk = "high";
    for (const hit of highHits.slice(0, 10)) reasons.push(`high: ${hit.reason} (${hit.file})`);
  }

  const srcFiles = files.filter((file) => /^src\//.test(file) && !/\.test\.ts$/.test(file));
  const testFiles = files.filter((file) => /\.test\.ts$/.test(file) || /^test\//.test(file));
  const srcModules = new Set(srcFiles.map((file) => file.split("/").slice(0, 2).join("/")));

  if (risk !== "high") {
    if (srcModules.size > 1) {
      risk = "medium";
      reasons.push(`medium: touches ${srcModules.size} source areas`);
    }
    if (stats.total > maxLowLines || files.length > maxLowFiles) {
      risk = risk === "low" ? "medium" : risk;
      reasons.push(`medium: change size (${stats.total} lines, ${files.length} files) exceeds low thresholds`);
    }
    if (srcFiles.length > 0 && testFiles.length === 0) {
      risk = "medium";
      reasons.push("medium: source changed without accompanying test changes");
    }
  }

  if (risk === "low") reasons.push("low: small, single-area, tested change with no risky paths");
  return { risk, reasons, srcFiles, testFiles };
}

function verificationGreen() {
  const qaReport = readJsonSafe(".quality/qa-gate-report.json");
  const ratchet = readJsonSafe(".quality/ratchet-report.json");
  const qaOk = qaReport ? qaReport.passed === true : null;
  const ratchetOk = ratchet ? !ratchet.results?.some((result) => result.failed) : null;
  return { qaOk, ratchetOk };
}

function main() {
  const files = changedFiles();
  const stats = diffStats();
  const { risk, reasons } = classify(files, stats);
  const { qaOk, ratchetOk } = verificationGreen();

  // Auto only when low risk and no verification signal is explicitly failing.
  const verificationFailing = qaOk === false || ratchetOk === false;
  const route = risk === "low" && !verificationFailing ? "auto" : "human";

  const report = {
    generatedAt: new Date().toISOString(),
    base,
    head,
    risk,
    riskLabel: `risk:${risk}`,
    route,
    reasons,
    changedFiles: files,
    stats,
    verification: { qaOk, ratchetOk },
  };

  writeJson(path.join(root, reportPath), report);
  console.log(JSON.stringify(report, null, 2));

  if (hasFlag("--assert-auto") && route !== "auto") {
    console.error(`[agent:preflight] route is "${route}", not auto`);
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`[agent:preflight] ${error.message}`);
  process.exit(1);
}
