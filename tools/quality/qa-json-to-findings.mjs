#!/usr/bin/env node
import fs from "node:fs";
import { normalizeFinding, writeFindings } from "./lib/findings.mjs";

const args = process.argv.slice(2);
const inputPath = args[0] && !args[0].startsWith("--") ? args[0] : ".ai/workspace/qa/outputs/qa-review.json";
const outIndex = args.indexOf("--out");
const outputPath = outIndex >= 0 ? args[outIndex + 1] : undefined;
const root = process.cwd();
const report = fs.existsSync(inputPath) ? JSON.parse(fs.readFileSync(inputPath, "utf8")) : {};
const findings = [];

function severityFromQa(qaSeverity, blocking) {
  if (qaSeverity === "P0" || qaSeverity === "P1") return "error";
  if (blocking) return "error";
  if (qaSeverity === "P2") return "warning";
  return "info";
}

function addFinding(finding, blocking) {
  const qaSeverity = finding.severity ?? (blocking ? "P1" : "P3");
  findings.push(normalizeFinding({
    tool: "qa-cross-model",
    ruleId: qaSeverity,
    severity: severityFromQa(qaSeverity, blocking),
    file: finding.file ?? "unknown",
    line: finding.line,
    message: finding.problem ?? finding.message ?? finding.why_it_matters ?? "QA finding"
  }, root));
}

for (const finding of report.blocking_findings ?? report.blockingFindings ?? []) {
  addFinding(finding, true);
}

for (const finding of report.non_blocking_findings ?? report.nonBlockingFindings ?? []) {
  addFinding(finding, false);
}

for (const missingTest of report.missing_tests ?? report.missingTests ?? []) {
  findings.push(normalizeFinding({
    tool: "qa-cross-model",
    ruleId: "missing-test",
    severity: "warning",
    file: "tests",
    message: String(missingTest)
  }, root));
}

if (outputPath) {
  writeFindings(outputPath, findings, root);
} else {
  console.log(JSON.stringify(findings, null, 2));
}
