# Changelog

## [0.2.0](https://github.com/futex-ai/mokabook/compare/v0.1.0...v0.2.0) (2026-07-22)


### Features

* add pull request preview deployments ([#12](https://github.com/futex-ai/mokabook/issues/12)) ([37b7dc3](https://github.com/futex-ai/mokabook/commit/37b7dc34190ab076d05f44ab4de334febafdc8df))
* move viewport switch into header ([#11](https://github.com/futex-ai/mokabook/issues/11)) ([d5ee0be](https://github.com/futex-ai/mokabook/commit/d5ee0be162f27ad41bec9e3f12bd57a374f2cff0))


### Bug Fixes

* **browse:** copy IDs without navigation ([#13](https://github.com/futex-ai/mokabook/issues/13)) ([5123150](https://github.com/futex-ai/mokabook/commit/51231500f0c40eb1c72278a7f64ce4d4843cacd7))
* **release:** install before auditing signatures ([#8](https://github.com/futex-ai/mokabook/issues/8)) ([05b95d3](https://github.com/futex-ai/mokabook/commit/05b95d33291a32288397973402e11fb63b385f7c))
* **server:** advance past occupied ports ([#15](https://github.com/futex-ai/mokabook/issues/15)) ([9e416c2](https://github.com/futex-ai/mokabook/commit/9e416c229706df8f9eb0b98876843c37513c6f24))

## 0.1.0 (2026-07-20)


### Features

* **example:** prove the consumer contract against the real Firna stack - ([2b3827e](https://github.com/futex-ai/mokabook/commit/2b3827e7572c85a82696a1cc47d8bdee2e3dc14c))
* extract app-independent Mokabook framework from Accounting ([#1](https://github.com/futex-ai/mokabook/issues/1)) ([2b3827e](https://github.com/futex-ai/mokabook/commit/2b3827e7572c85a82696a1cc47d8bdee2e3dc14c))
* rebuild the served Browse shell to the refined Mockbook design from ([2b3827e](https://github.com/futex-ai/mokabook/commit/2b3827e7572c85a82696a1cc47d8bdee2e3dc14c))

## Changelog

All notable changes to Mokabook will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Initial app-independent Mokabook package foundation.
- Typed config discovery and public registry/Review authoring helpers.
- Deterministic React-to-static-HTML build and non-mutating output checks.
- Manifest-backed responsive Browse server with transactional watched lifecycle.
- Git-based per-viewport Review artifacts, comparison UI, and ignore normalization.
- Packed ESM, NodeNext, clean-cache npx, Accounting-shaped, and Juno-shaped
  consumer verification.
- Consumer-owned module resolution, legacy exclusions, and a temporary typed
  document compatibility bridge for staged migrations.
- Minimum/release-runtime CI plus release-please and tokenless npm trusted
  publishing automation.
