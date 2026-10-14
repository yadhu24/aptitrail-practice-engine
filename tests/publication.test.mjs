// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const source = resolve(import.meta.dirname, "..");
const script = join(source, "scripts/check-publication.mjs");
async function fixture(fn) {
  const temp = await mkdtemp(join(tmpdir(), "aptitrail-publication-"));
  try {
    await cp(source, temp, { recursive: true, filter: path => ![".git", "node_modules"].includes(path.split("/").at(-1)) });
    await fn(temp);
  } finally { await rm(temp, { recursive: true, force: true }); }
}
test("the actual release passes its publication allowlist and credential-pattern check", () => {
  const result = spawnSync(process.execPath, [script, source], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
test("an untracked environment file blocks publication", async () => fixture(async temp => {
  await writeFile(join(temp, ".env"), "DEMO_ONLY=placeholder\n");
  const result = spawnSync(process.execPath, [script, temp], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unexpected publication file: \.env/);
}));
test("a credential-shaped value in an allowed file blocks publication without logging its value", async () => fixture(async temp => {
  const value = "ghp_" + "A".repeat(36); // Deliberately fake; generated to test the scanner.
  await writeFile(join(temp, "examples/demo.mjs"), "// synthetic scanner fixture\nconst value = '" + value + "';\n");
  const result = spawnSync(process.execPath, [script, temp], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Possible credential in: examples\/demo\.mjs/);
  assert.ok(!result.stderr.includes(value));
}));
