// SPDX-License-Identifier: AGPL-3.0-only
import { validateBank, select, score, strip, revisionSchedule } from "../src/index.mjs";
import { sampleBank } from "./sample-bank.mjs";

validateBank(sampleBank);
const ids = select(sampleBank, {}, { rng: () => 0.5 });
const attempt = {
  ids,
  answers: {
    "sample-choice": "eight",
    "sample-values": { A: "6", B: "3" },
    "sample-frames": ["circle", "square"],
    "sample-passage-1": "extra",
  },
  helped: ["sample-choice"],
};
const result = score(attempt, sampleBank);
console.log(JSON.stringify({
  publicQuestion: strip(sampleBank[0]),
  result,
  dueTomorrow: revisionSchedule([{ finished: 0, result }], 86400000),
}, null, 2));
