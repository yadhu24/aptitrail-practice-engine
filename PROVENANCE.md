# Source provenance

Maintainer and copyright holder: Yadhunandan G S (`yadhu24`).

The practice functions were extracted from `lib/core.mjs` in the private
AptiTrail repository at commit `dac43787e0537d2a5c5afcb409baf4e34258dfaa`,
reviewed on 14 October 2026. The original module was authored for AptiTrail.
This package contains no source imports from that repository and has no third-party
library dependencies.

The copied functions are `validAnswer`, `isCorrect`, `score`, `strip`,
`select`, `selectBookmarks` and `revisionSchedule`.

Publication adaptations:

- Removed UUID, database, lease, payment, entitlement and provider code.
- Scoring now handles omitted response/help/confidence maps and empty attempts,
  indexes questions once, and rejects duplicate or unknown attempt IDs.
- Selection accepts an injected random source and clock, and fixed-free mixed
  requests include all areas.
- Added a bank validator, ESM declarations, isolated regression tests, a local
  publication guard and contributor documentation.
- Wrote all eight example questions independently for this release.

Excluded from this release: every production question and answer bank, content
approval record, business or customer record, credential, deployment setting,
provider evidence, worker bundle, backup, source-history archive and private Git
history. None of these assets is necessary to run the package.

The public release must start with fresh Git history containing only the
allowlisted package files. It must not be produced by making a branch or fork of
the commercial repository public.

This new package has no demonstrated external adoption at preparation time.
Existing commercial-site traffic must not be represented as package downloads,
GitHub stars or outside use of this newly released library.
