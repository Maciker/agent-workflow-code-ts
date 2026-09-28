import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function runGit(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    throw new Error("git " + args.join(" ") + " failed: " + error.message);
  }
}

export function resolveRefSha(root, ref) {
  const sha = runGit(root, ["rev-parse", ref]).trim();
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("Ref " + ref + " did not resolve to a full commit SHA");
  }
  return sha;
}

export function workingTreeSnapshot(root) {
  const status = runGit(root, ["status", "--short"]);
  const unstaged = runGit(root, ["diff", "--binary", "HEAD"]);
  const staged = runGit(root, ["diff", "--cached", "--binary"]);
  return {
    statusSha256: sha256(status),
    unstagedDiffSha256: sha256(unstaged),
    stagedDiffSha256: sha256(staged),
  };
}
