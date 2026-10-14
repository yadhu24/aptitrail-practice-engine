// SPDX-License-Identifier: AGPL-3.0-only
import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const allowed = new Set([
  ".github/workflows/verify.yml", ".gitignore", "AGENTS.md", "CHANGELOG.md",
  "CONTRIBUTING.md", "COPYRIGHT", "LICENSE", "PROVENANCE.md", "README.md",
  "SECURITY.md", "examples/demo.mjs", "examples/sample-bank.mjs",
  "package-lock.json", "package.json", "scripts/check-publication.mjs",
  "src/index.d.mts", "src/index.mjs", "tests/engine.test.mjs", "tests/publication.test.mjs",
]);
const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
  /\bAKIA[A-Z0-9]{16}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const errors = [], found = new Set();
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && [".git", "node_modules"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    const path = relative(root, full).replaceAll("\\", "/");
    if (entry.isSymbolicLink()) { errors.push("Symlink is outside the publication policy: " + path); continue; }
    if (entry.isDirectory()) { await walk(full); continue; }
    found.add(path);
    if (!allowed.has(path)) { errors.push("Unexpected publication file: " + path); continue; }
    const text = await readFile(full, "utf8");
    if (secretPatterns.some(pattern => pattern.test(text)))
      errors.push("Possible credential in: " + path);
  }
}
await walk(root);
for (const path of allowed) if (!found.has(path)) errors.push("Missing release file: " + path);
if (found.has("package.json")) {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (pkg.license !== "AGPL-3.0-only") errors.push("Unexpected proposed license");
  if (pkg.private !== true) errors.push("npm publication guard must remain enabled");
  if (Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length)
    errors.push("Dependencies need a deliberate publication review");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Publication snapshot check passed: " + found.size + " allowlisted files; no matching credential pattern.");
}
