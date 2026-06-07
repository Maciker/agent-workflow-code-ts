#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1];
  return fallback;
}

const repo = argValue("--repo", undefined);
const labelsPath = argValue("--labels", ".github/agent-labels.json");
const dryRun = args.includes("--dry-run");

const labels = JSON.parse(fs.readFileSync(path.join(root, labelsPath), "utf8"));

function gh(ghArgs) {
  const finalArgs = repo ? [...ghArgs, "--repo", repo] : ghArgs;
  const result = spawnSync("gh", finalArgs, { cwd: root, encoding: "utf8" });
  return result;
}

for (const label of labels) {
  const ghArgs = ["label", "create", label.name, "--color", label.color, "--description", label.description, "--force"];
  if (dryRun) {
    console.log(`would run: gh ${ghArgs.join(" ")}`);
    continue;
  }
  const result = gh(ghArgs);
  if ((result.status ?? 1) !== 0) {
    console.error(`failed to create label ${label.name}: ${result.stderr || result.stdout}`);
    process.exit(1);
  }
  console.log(`label ready: ${label.name}`);
}
