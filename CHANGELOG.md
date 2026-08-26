# Changelog

## [0.6.0](https://github.com/futex-ai/mokabook/compare/v0.5.1...v0.6.0) (2026-08-26)


### Features

* infer breadcrumbs from hierarchy ([#29](https://github.com/futex-ai/mokabook/issues/29)) ([f8aa5fc](https://github.com/futex-ai/mokabook/commit/f8aa5fcfb129fa6602f3b88da2343200f9b64a4a))
* navigate catalogue links through Browse ([#30](https://github.com/futex-ai/mokabook/issues/30)) ([4c3fd17](https://github.com/futex-ai/mokabook/commit/4c3fd17ad4d3a2bd7b42c3c21912dd17ff7e1d14))


### Bug Fixes

* **browse:** persist details before navigation ([#32](https://github.com/futex-ai/mokabook/issues/32)) ([9292dbc](https://github.com/futex-ai/mokabook/commit/9292dbcb4b64a685ec64269d55ac0cbcd57bd483))
* ignore compatibility nav paths in Changed ([#33](https://github.com/futex-ai/mokabook/issues/33)) ([6acfa2a](https://github.com/futex-ai/mokabook/commit/6acfa2a30e4fc920a6daec06ac0a9b4929a0e58e))

## [0.5.1](https://github.com/futex-ai/mokabook/compare/v0.5.0...v0.5.1) (2026-08-11)


### Bug Fixes

* compare branch changes from merge base ([#27](https://github.com/futex-ai/mokabook/issues/27)) ([f2c7dd2](https://github.com/futex-ai/mokabook/commit/f2c7dd26062825b079310438268832324980a882))

## [0.5.0](https://github.com/futex-ai/mokabook/compare/v0.4.0...v0.5.0) (2026-08-07)


### Features

* **example:** dark fragments become readable - dark accent [#7](https://github.com/futex-ai/mokabook/issues/7)fae95 ([c92e6e5](https://github.com/futex-ai/mokabook/commit/c92e6e5d69445309eb633a43ca69c924da34a0a2))
* native light/dark color scheme support ([#26](https://github.com/futex-ai/mokabook/issues/26)) ([c92e6e5](https://github.com/futex-ai/mokabook/commit/c92e6e5d69445309eb633a43ca69c924da34a0a2))


### Bug Fixes

* **browse:** remember details disclosure ([#24](https://github.com/futex-ai/mokabook/issues/24)) ([7e12e79](https://github.com/futex-ai/mokabook/commit/7e12e79115010b62b3a19b002ba1defc8731e1f9))
* **preview:** the static snapshot now rewrites data-fragment-light ([c92e6e5](https://github.com/futex-ai/mokabook/commit/c92e6e5d69445309eb633a43ca69c924da34a0a2))

## [0.4.0](https://github.com/futex-ai/mokabook/compare/v0.3.0...v0.4.0) (2026-07-28)


### Features

* **shell:** add a phone status band ([#21](https://github.com/futex-ai/mokabook/issues/21)) ([48e8007](https://github.com/futex-ai/mokabook/commit/48e8007a31659c2a53d9e9489f5efb36f5900a6c))


### Performance Improvements

* **review:** speed large catalogue loading ([#23](https://github.com/futex-ai/mokabook/issues/23)) ([bd28247](https://github.com/futex-ai/mokabook/commit/bd28247d88405a9cfb5a94efa9d509bec444a9fd))

## [0.3.0](https://github.com/futex-ai/mokabook/compare/v0.2.0...v0.3.0) (2026-07-23)


### Features

* **review:** serve Review at /review in the shell design ([#19](https://github.com/futex-ai/mokabook/issues/19)) ([bf06cbb](https://github.com/futex-ai/mokabook/commit/bf06cbb336d435192902da9f55155c8c2504c019))


### Bug Fixes

* **release:** retry registry propagation ([#16](https://github.com/futex-ai/mokabook/issues/16)) ([c7bbf23](https://github.com/futex-ai/mokabook/commit/c7bbf23429d39f6e1d536b5c23e0e64cf8e83105))
* **review:** keep served artifacts current ([#20](https://github.com/futex-ai/mokabook/issues/20)) ([8fff547](https://github.com/futex-ai/mokabook/commit/8fff547ba05cd5ff542bb03242d7950e61b681d4))

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
