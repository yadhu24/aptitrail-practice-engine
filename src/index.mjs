// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Yadhunandan G S
// Extracted from AptiTrail; publication adaptations are recorded in PROVENANCE.md.

export function validAnswer(q, a) {
  if (a === null || a === undefined) return false;
  if (q.schema === "values")
    return (
      a &&
      typeof a === "object" &&
      !Array.isArray(a) &&
      q.targets.every((t) => {
        if (!Object.hasOwn(a, t)) return false;
        const value = a[t];
        // Form controls send strings. Structured values and booleans are not
        // numeric responses, even when JavaScript could coerce them to one.
        if (typeof value !== "number" && typeof value !== "string") return false;
        if (typeof value === "string" && !value.trim()) return false;
        const number = Number(value);
        return Number.isInteger(number) && number >= 1 && number <= 20;
      })
    );
  if (q.schema === "frames")
    return (
      Array.isArray(a) &&
      a.length === 2 &&
      a.every((v, i) => q.choices[i].some((c) => c.id === v))
    );
  return q.choices.some((c) => c.id === a);
}
export function isCorrect(q, a) {
  if (!validAnswer(q, a)) return false;
  if (q.schema === "values")
    return q.targets.every((t) => Number(a[t]) === q.answer[t]);
  return JSON.stringify(a) === JSON.stringify(q.answer);
}
export function score(attempt, bank) {
  if (!Array.isArray(attempt?.ids)) throw new TypeError("attempt.ids must be an array");
  if (new Set(attempt.ids).size !== attempt.ids.length)
    throw new RangeError("attempt.ids must not contain duplicate questions");
  const byId = new Map(bank.map(q => [q.id, q]));
  const helped = new Set(attempt.helped ?? []);
  const answers = attempt.answers ?? {};
  const confidence = attempt.confidence ?? {};
  const rows = attempt.ids.map(id => {
    const q = byId.get(id);
    if (!q) throw new RangeError("Unknown question ID: " + id);
    const response = answers[id];
    return {
      id, area: q.area, family: q.family,
      status: !validAnswer(q, response) ? "unanswered" : isCorrect(q, response) ? "correct" : "wrong",
      helped: helped.has(id),
      confidence: confidence[id] ?? null,
    };
  });
  const correct = rows.filter(row => row.status === "correct").length;
  const wrong = rows.filter(row => row.status === "wrong").length;
  return {
    total: rows.length, correct, wrong, unanswered: rows.length - correct - wrong,
    percentage: rows.length ? Math.round(10000 * correct / rows.length) / 100 : 0,
    unaided: rows.filter(row => row.status === "correct" && !row.helped).length,
    rows,
  };
}
export function strip(q) {
  const {
    answer,
    hint,
    steps,
    pitfall,
    completion,
    model,
    rule,
    optionReasons,
    solutionHash,
    ...publicItem
  } = q;
  return publicItem;
}
export function select(
  bank,
  seen,
  { area = "mixed", mode = "practice", history = [], rng = Math.random, now = Date.now() } = {},
) {
  let pool = bank.filter(
    (q) => (area === "mixed" || q.area === area) && q.pool === "drill",
  );
  if (mode === "free")
    return bank
      .filter((q) => q.pool === "free" && (area === "mixed" || q.area === area))
      .map((q) => q.id);
  const revision = ["revision", "due"].includes(mode),
    families = {};
  for (const t of history)
    for (const r of t.result?.rows || [])
      if (r.status !== "correct")
        families[r.family] = (families[r.family] || 0) + 1;
  if (revision) {
    const due = revisionSchedule(history, now),
      latest = new Map();
    for (const t of [...history].sort((a, b) => a.finished - b.finished))
      for (const r of t.result?.rows || []) latest.set(r.id, r);
    const ids = new Set(
      bank
        .filter((q) => {
          const r = latest.get(q.id);
          return mode === "due"
            ? !!due[q.id]
            : r && (r.status !== "correct" || r.helped);
        })
        .map((q) => q.testletId || q.id),
    );
    pool = bank.filter(
      (q) =>
        ids.has(q.testletId || q.id) && (area === "mixed" || area === q.area),
    );
  }
  const grouped = Object.groupBy(pool, (q) => q.testletId || q.id);
  let groups = Object.values(grouped)
    .filter((g) => !g[0].testletId || g.length === 5)
    .map((items) => ({
      items,
      min: Math.min(...items.map((q) => seen[q.id] || 0)),
      sum: items.reduce((n, q) => n + (seen[q.id] || 0), 0),
      weight: rng() + Math.min(3, families[items[0].family] || 0) * 0.1,
    }));
  if (!groups.length) return [];
  // Whole passages are selection units. Untouched groups precede partial passages.
  if (!revision) {
    const cycle = Math.min(...groups.map((g) => g.min));
    groups = groups.filter((g) => g.min === cycle);
  }
  groups.sort((a, b) =>
    !revision ? a.sum - b.sum || b.weight - a.weight : b.weight - a.weight,
  );
  const picked = [],
    used = new Set();
  if (area === "mixed" && mode === "practice")
    for (const type of ["figures", "equations", "latin", "academic"]) {
      let n = 0;
      for (const g of groups)
        if (g.items[0].area === type && n + g.items.length <= 5) {
          picked.push(...g.items.map((q) => q.id));
          n += g.items.length;
          used.add(g);
        }
    }
  for (const g of groups)
    if (!used.has(g) && picked.length + g.items.length <= 20)
      picked.push(...g.items.map((q) => q.id));
  return picked;
}
export function selectBookmarks(bank, bookmarked) {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const groups = Object.groupBy(bank, (q) => q.testletId || q.id);
  const selected = [], used = new Set();
  for (const item of bookmarked) {
    const q = byId.get(item);
    if (!q) continue;
    const key = q.testletId || q.id, group = groups[key];
    if (used.has(key) || (q.testletId && group.length !== 5)) continue;
    used.add(key);
    if (selected.length + group.length <= 20)
      selected.push(...group.map((q) => q.id));
  }
  return selected;
}
export function revisionSchedule(history, now = Date.now()) {
  let out = {};
  for (let t of [...history].sort((a, b) => a.finished - b.finished))
    for (let r of t.result?.rows || []) {
      let prior = out[r.id];
      if (r.status !== "correct" || r.helped)
        out[r.id] = { stage: 0, due: t.finished + 86400000 };
      else if (prior) {
        let stage = prior.stage + 1;
        out[r.id] = {
          stage,
          due: stage > 3 ? null : t.finished + [0, 3, 7, 14][stage] * 86400000,
        };
      }
    }
  return Object.fromEntries(
    Object.entries(out).filter(([, r]) => r.due !== null && r.due <= now),
  );
}
/** Validate a trusted authoring bank before serving it to learners. */
export function validateBank(bank) {
  if (!Array.isArray(bank)) throw new TypeError("bank must be an array");
  const ids = new Set(), testlets = new Map();
  for (const q of bank) {
    if (!q || typeof q !== "object" || Array.isArray(q))
      throw new TypeError("Each question must be an object");
    for (const key of ["id", "area", "family", "pool"])
      if (typeof q[key] !== "string" || !q[key].trim())
        throw new TypeError("Question " + key + " must be a nonempty string");
    if (ids.has(q.id)) throw new RangeError("Duplicate question ID: " + q.id);
    ids.add(q.id);
    const checkChoices = choices => {
      if (!Array.isArray(choices) || choices.length < 2)
        throw new TypeError("At least two choices are required");
      const choicesSeen = new Set();
      for (const choice of choices) {
        if (!choice || typeof choice.id !== "string" || !choice.id.trim() || choicesSeen.has(choice.id))
          throw new TypeError("Choice IDs must be nonempty and unique");
        choicesSeen.add(choice.id);
      }
    };
    if (q.schema === "choice") checkChoices(q.choices);
    else if (q.schema === "frames") {
      if (!Array.isArray(q.choices) || q.choices.length !== 2)
        throw new TypeError("frames questions require two choice lists");
      q.choices.forEach(checkChoices);
    } else if (q.schema === "values") {
      if (!Array.isArray(q.targets) || !q.targets.length ||
          q.targets.some(t => typeof t !== "string" || !t.trim()) ||
          new Set(q.targets).size !== q.targets.length)
        throw new TypeError("values questions require unique nonempty targets");
      if (!q.answer || typeof q.answer !== "object" ||
          q.targets.some(t => !Number.isInteger(q.answer[t])))
        throw new TypeError("Authoring answers must be integer values");
    } else throw new TypeError("Unsupported question schema: " + q.schema);
    if (!validAnswer(q, q.answer))
      throw new RangeError("Authoring answer is outside the allowed choices or range: " + q.id);
    if (q.testletId !== undefined) {
      if (typeof q.testletId !== "string" || !q.testletId.trim())
        throw new TypeError("testletId must be a nonempty string");
      const group = testlets.get(q.testletId) ?? [];
      group.push(q);
      testlets.set(q.testletId, group);
    }
  }
  for (const [key, group] of testlets) {
    if (group.length !== 5) throw new RangeError("Testlet must contain exactly five questions: " + key);
    if (group.some(q => q.area !== group[0].area || q.pool !== group[0].pool))
      throw new RangeError("Testlet questions must share an area and pool: " + key);
  }
  return bank;
}

