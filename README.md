# AptiTrail Practice Engine

A small JavaScript library for developers building practice and learning tools.
It selects questions, validates responses, scores attempts, expands bookmarked
passages, and schedules revision. It contains no production question bank.

This is a new open-source release extracted from the practice logic behind
[AptiTrail](https://aptitrail.com). The public package's adoption and download
counts are not established. It is an independent practice tool and has no
affiliation with an exam provider.

## Try it

Requires Node.js 24 or later. There are no runtime or development dependencies.

```sh
npm ci
npm test
npm run example
npm run check
```

The example uses eight small questions written specifically for this package.
Its answers are included so developers can inspect and test the library.

## Use it

```js
import { validateBank, select, strip, score } from "./src/index.mjs";
import { sampleBank } from "./examples/sample-bank.mjs";

validateBank(sampleBank);
const ids = select(sampleBank, {});
const publicQuestions = ids.map(id => strip(sampleBank.find(q => q.id === id)));
const result = score({
  ids,
  answers: { "sample-choice": "eight" },
  helped: [],
}, sampleBank);
```

Store the authoring bank and call `score` on your trusted server. Send only
`strip(question)` to learners while they are answering. Importing the full bank
into a client bundle exposes its answers. `strip` removes this library's defined
solution fields; keep unrelated private metadata out of the bank or remove it
separately.

## API

| Function | Behavior |
| --- | --- |
| `validateBank(bank)` | Validates IDs, choices, answers, schemas and five-question passage groups; returns the supplied bank. |
| `validAnswer(q, response)` | Checks whether a response matches the question's input format. |
| `isCorrect(q, response)` | Validates and compares a response with the authoring answer. |
| `score(attempt, bank)` | Returns correct, wrong, unanswered, percentage, unaided-correct and question-level results. |
| `strip(q)` | Removes answer, hint, steps, pitfall, completion, model, rule, optionReasons and solutionHash. |
| `select(bank, seen, options)` | Selects a practice, fixed-free, revision or due set. |
| `selectBookmarks(bank, ids)` | Expands bookmarked passages without splitting them. |
| `revisionSchedule(history, now)` | Returns currently due items with their revision stage and due timestamp. |

ESM TypeScript declarations are provided in `src/index.d.mts`.

## Question schemas

Every question has a unique `id`, `area`, `family` and `pool`.

- `choice`: a list of choices with string IDs and one answer ID.
- `frames`: two choice lists and an ordered pair of answer IDs.
- `values`: named targets with integer answers from 1 through 20. Form strings such as `"6"` are accepted; blanks, booleans, arrays, non-integers and out-of-range values are rejected.

A `testletId` marks a passage containing exactly five questions in one area and
pool. Passage members are selected together. Supply only active questions to the
selection functions.

## Selection contract

- Practice selects up to 20 drill questions. Mixed practice tries to reserve up
  to five each for `figures`, `equations`, `latin` and `academic`.
- `seen` maps question IDs to exposure counts. Practice prioritizes the least
  exposed cycle before repeating it.
- Free mode returns the supplied fixed `free` pool for the requested area; its
  size is not capped at 20.
- Revision uses each question's latest attempt and includes incorrect,
  unanswered and helped answers.
- Due mode selects scheduled items and expands a complete passage when one
  member is due. Other members may therefore accompany a due item.
- Pass `rng` and `now` in the options for repeatable selections and clock-bound
  tests. The default random source is `Math.random`.
- Validate the bank before use. Selection defensively ignores incomplete
  passages but does not repair malformed authoring data.

## Scoring and revision

Missing or invalid responses count as unanswered. Percentage uses all attempt
questions as the denominator. Helped correct answers count toward correctness
but not unaided correctness. Unknown or duplicate attempt IDs throw an error.
An empty attempt returns a zero percentage.

Wrong, unanswered, or helped answers become due after one day. Subsequent
unaided correct answers advance the existing schedule by 3, 7 and 14 days.
The next unaided success retires the item. A new failure or use of help restarts
the cycle. Timestamps are milliseconds since the Unix epoch and the intervals
are fixed 24-hour days. This schedule is a product heuristic, not a clinical or
exam-score prediction.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull requests and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.
See [PROVENANCE.md](PROVENANCE.md) for source origins and publication changes.

## License

GNU Affero General Public License version 3 only (`AGPL-3.0-only`).
See [LICENSE](LICENSE) and [COPYRIGHT](COPYRIGHT) for the exact terms and notices.
Commercial use is allowed under those terms. Modified network-served versions
have source-sharing obligations. The AptiTrail name and logo are not licensed
as trademarks by this package.

The npm package is marked `private` to prevent accidental registry publishing.
It can be cloned, imported by path, or packed locally.
