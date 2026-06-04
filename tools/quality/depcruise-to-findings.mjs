#!/usr/bin/env node
import fs from "node:fs";
import { normalizeFinding, writeFindings } from "./lib/findings.mjs";

const args = process.argv.slice(2);
const inputPath = args[0] && !args[0].startsWith("--") ? args[0] : ".quality/depcruise.json";
const outIndex = args.indexOf("--out");
const outputPath = outIndex >= 0 ? args[outIndex + 1] : undefined;
const root = process.cwd();
const report = fs.existsSync(inputPath) ? JSON.parse(fs.readFileSync(inputPath, "utf8")) : {};
const findings = [];

function addFinding(source, dependency, rule, message) {
  findings.push(normalizeFinding({
    tool: "dependency-cruiser",
    ruleId: rule?.name ?? rule?.rule ?? "dependency-rule",
    severity: rule?.severity ?? "error",
    file: source,
    message: message ?? `${source} violates dependency rule for ${dependency ?? "unknown dependency"}`
  }, root));
}

for (const violation of report.summary?.violations ?? []) {
  addFinding(
    violation.from ?? violation.source ?? violation.module ?? "unknown",
    violation.to ?? violation.dependency ?? "unknown",
    { name: violation.rule?.name ?? violation.rule ?? violation.name, severity: violation.severity },
    violation.message
  );
}

for (const moduleEntry of report.modules ?? []) {
  const source = moduleEntry.source ?? moduleEntry.fileName ?? "unknown";
  for (const dependency of moduleEntry.dependencies ?? []) {
    if (dependency.valid !== false && !dependency.rules?.length) continue;
    for (const rule of dependency.rules ?? [{ name: "dependency-rule", severity: "error" }]) {
      addFinding(
        source,
        dependency.resolved ?? dependency.module,
        rule,
        `${source} -> ${dependency.resolved ?? dependency.module ?? "unknown"} violates ${rule.name ?? "dependency rule"}`
      );
    }
  }
}

if (outputPath) {
  writeFindings(outputPath, findings, root);
} else {
  console.log(JSON.stringify(findings, null, 2));
}
