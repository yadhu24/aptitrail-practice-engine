// SPDX-License-Identifier: AGPL-3.0-only
// These small fixtures were written for this package. They are not copied from an exam or the paid bank.
export const sampleBank = [
  {
    id: "sample-choice", schema: "choice", area: "figures", family: "doubling", pool: "drill",
    prompt: "A row contains 1, 2, then 4 circles. If the count keeps doubling, what comes next?",
    choices: [{ id: "six", text: "6" }, { id: "eight", text: "8" }, { id: "ten", text: "10" }],
    answer: "eight", hint: "Multiply the count by two.", steps: ["4 × 2 = 8."],
  },
  {
    id: "sample-values", schema: "values", area: "equations", family: "addition", pool: "drill",
    prompt: "A + B = 9 and A − B = 3. Enter A and B.",
    targets: ["A", "B"], answer: { A: 6, B: 3 },
    steps: ["Add the equations: 2A = 12, so A = 6.", "B = 9 − 6 = 3."],
  },
  {
    id: "sample-frames", schema: "frames", area: "figures", family: "alternation", pool: "drill",
    prompt: "After circle, square, circle, square, choose the next two shapes.",
    choices: [
      [{ id: "circle", text: "Circle" }, { id: "square", text: "Square" }],
      [{ id: "circle", text: "Circle" }, { id: "square", text: "Square" }],
    ],
    answer: ["circle", "square"], steps: ["The two shapes alternate."],
  },
  ...[6, 9, 12, 15, 18].map((answer, i) => ({
    id: "sample-passage-" + (i + 1), schema: "choice", area: "academic",
    family: "boxes-of-three", pool: "drill", testletId: "sample-passage",
    prompt: "A workshop puts 3 pencils in every box. How many pencils are in " + (i + 2) + " boxes?",
    choices: [{ id: "right", text: String(answer) }, { id: "extra", text: String(answer + 1) }],
    answer: "right", steps: [String(i + 2) + " × 3 = " + answer + "."],
  })),
];
