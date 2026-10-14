// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { validAnswer, isCorrect, score, strip, select, selectBookmarks, revisionSchedule, validateBank } from "../src/index.mjs";
import { sampleBank } from "../examples/sample-bank.mjs";

const DAY = 86400000;
const choice = (id, area = "figures", pool = "drill") => ({
  id, area, pool, family: "test-family", schema: "choice",
  choices: [{ id: "yes" }, { id: "no" }], answer: "yes",
});
const passage = (key, area = "academic") => Array.from({ length: 5 }, (_, i) => ({
  ...choice(key + "-" + i, area), testletId: key,
}));
const row = (id, status = "wrong", helped = false) => ({ id, area: "figures", family: "test-family", status, helped, confidence: null });
const history = (finished, ...rows) => ({ finished, result: { rows } });

test("the independently written example bank validates and supports all answer formats", () => {
  assert.equal(validateBank(sampleBank), sampleBank);
  assert.equal(isCorrect(sampleBank[0], "eight"), true);
  assert.equal(isCorrect(sampleBank[1], { A: "6", B: "3" }), true);
  assert.equal(isCorrect(sampleBank[2], ["circle", "square"]), true);
});
test("numeric controls reject booleans, blanks, arrays, fractional and out-of-range values", () => {
  const q = sampleBank[1];
  for (const A of [true, false, "", " ", [], {}, 0, 21, 1.5, NaN, Infinity])
    assert.equal(validAnswer(q, { A, B: 3 }), false, "unexpected valid value: " + String(A));
  assert.equal(validAnswer(q, { A: 6 }), false);
  assert.equal(validAnswer(q, { A: "6", B: "4" }), true);
  assert.equal(isCorrect(q, { A: "6", B: "4" }), false);
});
test("frame answers require the right number, order, and choice IDs", () => {
  const q = sampleBank[2];
  assert.equal(validAnswer(q, ["circle"]), false);
  assert.equal(validAnswer(q, ["circle", "unknown"]), false);
  assert.equal(isCorrect(q, ["square", "circle"]), false);
  assert.equal(isCorrect(q, ["circle", "square"]), true);
});
test("invalid choices count as unanswered rather than a scored wrong answer", () => {
  const bank = [choice("one"), choice("two"), choice("three")];
  const result = score({ ids: ["one", "two", "three"], answers: { one: "yes", two: "no", three: "typo" }, helped: ["one"] }, bank);
  assert.deepEqual([result.correct, result.wrong, result.unanswered, result.unaided, result.percentage], [1, 1, 1, 0, 33.33]);
});
test("omitted answer, help, and confidence maps are safe", () => {
  const result = score({ ids: ["one"] }, [choice("one")]);
  assert.equal(result.unanswered, 1);
  assert.equal(result.rows[0].helped, false);
  assert.equal(result.rows[0].confidence, null);
});
test("an empty attempt produces a finite zero percentage", () => {
  assert.equal(score({ ids: [] }, []).percentage, 0);
});
test("unknown and duplicate IDs cannot silently inflate a score", () => {
  assert.throws(() => score({ ids: ["missing"] }, [choice("one")]), /Unknown question/);
  assert.throws(() => score({ ids: ["one", "one"] }, [choice("one")]), /duplicate/);
});
test("learner projection omits worked solutions and authoring metadata", () => {
  const publicItem = strip({ ...choice("one"), hint: "hint", steps: ["step"], pitfall: "pitfall", completion: "solution",
    model: { answer: "yes" }, rule: "rule", optionReasons: {}, solutionHash: "fingerprint", prompt: "visible" });
  assert.deepEqual(Object.keys(publicItem).sort(), ["area", "choices", "family", "id", "pool", "prompt", "schema"].sort());
  assert.equal(publicItem.prompt, "visible");
});
test("a focused round never selects another area's questions", () => {
  const bank = [...Array.from({ length: 12 }, (_, i) => choice("fig-" + i)), ...Array.from({ length: 12 }, (_, i) => choice("eq-" + i, "equations"))];
  const ids = select(bank, {}, { area: "equations", rng: () => 0.5 });
  assert.equal(ids.length, 12);
  assert.ok(ids.every(id => id.startsWith("eq-")));
});
test("mixed rounds balance the four supported areas and stay within 20", () => {
  const bank = ["figures", "equations", "latin", "academic"].flatMap(area =>
    Array.from({ length: 9 }, (_, i) => choice(area + "-" + i, area)));
  const ids = select(bank, {}, { rng: () => 0.5 });
  assert.equal(ids.length, 20);
  for (const area of ["figures", "equations", "latin", "academic"])
    assert.equal(ids.filter(id => id.startsWith(area)).length, 5);
});
test("practice favors the least-exposed cycle", () => {
  const bank = [choice("unseen"), choice("seen")];
  assert.deepEqual(select(bank, { seen: 1 }, { rng: () => 0.5 }), ["unseen"]);
  assert.equal(select(bank, { unseen: 1, seen: 1 }, { rng: () => 0.5 }).length, 2);
});
test("selection preserves whole five-question passages and excludes partial ones", () => {
  const bank = [...passage("whole"), ...passage("partial").slice(0, 4)];
  assert.deepEqual(new Set(select(bank, {}, { rng: () => 0.5 })), new Set(passage("whole").map(q => q.id)));
});
test("free selection returns the fixed free pool, including mixed requests", () => {
  const bank = [choice("free-f", "figures", "free"), choice("free-e", "equations", "free"), choice("paid")];
  assert.deepEqual(select(bank, {}, { mode: "free" }), ["free-f", "free-e"]);
  assert.deepEqual(select(bank, {}, { mode: "free", area: "figures" }), ["free-f"]);
});
test("bookmark expansion preserves passages and suppresses duplicates and unknown IDs", () => {
  const bank = [choice("one"), ...passage("pass")];
  const ids = selectBookmarks(bank, ["pass-2", "pass-4", "one", "missing"]);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  for (const q of passage("pass")) assert.ok(ids.includes(q.id));
});
test("bookmarks cannot split a passage when only four round slots remain", () => {
  const singles = Array.from({ length: 16 }, (_, i) => choice("single-" + i));
  const bank = [...singles, ...passage("pass")];
  const ids = selectBookmarks(bank, [...singles.map(q => q.id), "pass-0"]);
  assert.equal(ids.length, 16);
  assert.ok(!ids.some(id => id.startsWith("pass-")));
});
test("revision uses the latest result and includes helped correct answers", () => {
  const bank = [choice("fixed"), choice("wrong"), choice("helped")];
  const h = [history(0, row("fixed"), row("wrong")), history(1000, row("fixed", "correct"), row("helped", "correct", true))];
  assert.deepEqual(new Set(select(bank, {}, { mode: "revision", history: h, rng: () => 0.5 })), new Set(["wrong", "helped"]));
});
test("a failed attempt is due exactly one day later", () => {
  const h = [history(1000, row("one"))];
  assert.deepEqual(revisionSchedule(h, 1000 + DAY - 1), {});
  assert.deepEqual(revisionSchedule(h, 1000 + DAY), { one: { stage: 0, due: 1000 + DAY } });
});
test("unaided successes advance revision through 3, 7, and 14 days, then retire it", () => {
  let h = [history(0, row("one"))];
  let finished = DAY;
  for (const [stage, gap] of [[1, 3], [2, 7], [3, 14]]) {
    h.push(history(finished, row("one", "correct")));
    assert.deepEqual(revisionSchedule(h, finished + gap * DAY), { one: { stage, due: finished + gap * DAY } });
    finished += gap * DAY;
  }
  h.push(history(finished, row("one", "correct")));
  assert.deepEqual(revisionSchedule(h, finished + 100 * DAY), {});
});
test("using help resets an established revision cycle", () => {
  const h = [history(0, row("one")), history(DAY, row("one", "correct")), history(2 * DAY, row("one", "correct", true))];
  assert.deepEqual(revisionSchedule(h, 3 * DAY), { one: { stage: 0, due: 3 * DAY } });
});
test("due selection supports a fixed clock and expands an entire passage", () => {
  const bank = passage("pass");
  const h = [history(0, row("pass-2"))];
  assert.deepEqual(select(bank, {}, { mode: "due", history: h, now: DAY - 1, rng: () => 0.5 }), []);
  assert.equal(select(bank, {}, { mode: "due", history: h, now: DAY, rng: () => 0.5 }).length, 5);
});
test("authoring validation rejects duplicate IDs and invalid correct answers", () => {
  assert.throws(() => validateBank([choice("same"), choice("same")]), /Duplicate/);
  assert.throws(() => validateBank([{ ...choice("one"), answer: "unknown" }]), /Authoring answer/);
});
test("authoring validation rejects malformed schemas and passage metadata", () => {
  assert.throws(() => validateBank([{ ...choice("one"), schema: "unsupported" }]), /Unsupported/);
  assert.throws(() => validateBank(passage("pass").slice(0, 4)), /exactly five/);
  const mixed = passage("pass"); mixed[0].pool = "free";
  assert.throws(() => validateBank(mixed), /share an area and pool/);
});
