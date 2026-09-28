#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { argHelpers } from "../lib/args.mjs";
import { sha256 } from "./qa-context.mjs";

const root = process.cwd();
const { value: argValue } = argHelpers();
const contextPath = argValue("--context", ".ai/workspace/qa/inputs/qa-context.json");
const outputPath = argValue("--output", ".ai/workspace/qa/outputs/qa-review.json");
const manifestPath = argValue("--manifest", ".ai/workspace/qa/outputs/qa-run.json");

function fail(message) {
  throw new Error(message);
}

function readJson(relativePath) {
  const absolute = path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
  if (!fs.existsSync(absolute)) fail("Missing " + relativePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

const context = readJson(contextPath);
const reviewerProvider = argValue("--reviewer-provider", null);
const reviewerModel = argValue("--reviewer-model", null);
const implementerProvider = argValue("--implementer-provider", null);
const implementerModel = argValue("--implementer-model", context.implementerModel ?? null);

if (!reviewerModel) fail("A verified reviewer model is required");
if (!implementerModel) fail("A verified implementer model is required");

const reviewerIdentity = reviewerProvider ? reviewerProvider + ":" + reviewerModel : reviewerModel;
const implementerIdentity = implementerProvider ? implementerProvider + ":" + implementerModel : implementerModel;
const modelDistinct = reviewerIdentity !== implementerIdentity;
const reviewAbsolute = path.isAbsolute(outputPath) ? outputPath : path.join(root, outputPath);
if (!fs.existsSync(reviewAbsolute)) fail("Missing QA review at " + outputPath);

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  contextPath,
  inputPath: context.inputPath,
  inputSha256: context.inputSha256,
  headSha: context.headSha,
  outputPath,
  reviewSha256: sha256(fs.readFileSync(reviewAbsolute, "utf8")),
  reviewerProvider,
  reviewerModel,
  implementerProvider,
  implementerModel,
  reviewerIdentity,
  implementerIdentity,
  modelDistinct,
  modelVerification: modelDistinct ? "verified" : "failed",
};

const manifestAbsolute = path.isAbsolute(manifestPath) ? manifestPath : path.join(root, manifestPath);
fs.mkdirSync(path.dirname(manifestAbsolute), { recursive: true });
fs.writeFileSync(manifestAbsolute, JSON.stringify(manifest, null, 2) + "\n");

if (!modelDistinct) {
  fail("Reviewer and implementer identities are equal; independent QA is unavailable");
}

console.log(JSON.stringify({
  recorded: true,
  reviewerIdentity,
  implementerIdentity,
  modelVerification: manifest.modelVerification,
}, null, 2));
