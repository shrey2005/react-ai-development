# Changelog

All notable changes to `@shrey/react-ai` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-28

### Added
- **Production Dual Packaging (Phase 6)**: Configured dual ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) distribution targets with separate TypeScript type declarations (`dist/index.d.ts` and `dist/index.d.cts`).
- **Conditional Exports**: Implemented NodeNext / bundler compatible conditional export map in `package.json` with dedicated `types`, `import`, and `require` resolution.
- **Tree-Shaking Optimization**: Declared `"sideEffects": false` in `package.json` for maximal bundler dead-code elimination.
- **Package Whitelist**: Configured `"files"` whitelist restricting published NPM tarball strictly to production distribution artifacts (`dist`) and documentation.
- **Custom Typed Errors**: Introduced and exported `AIHttpError` alongside `AITimeoutError` with prototype chain preservation.
- **Comprehensive Release Documentation**: Authored production-ready `README.md` (architecture flowcharts, state machine diagrams, quick start, full API reference), `CHANGELOG.md`, and `CONTRIBUTING.md`.
- **Prepack Hook**: Automated compilation pipeline via `prepack` script guaranteeing fresh builds on `npm pack` or publish.
- **Coverage & Code Quality**: Vitest v8 coverage suite achieving >94% overall statement coverage and 100% function coverage; ESLint flat config with zero warnings.

### Changed
- Promoted package version from `0.1.0` to `1.0.0` for official production stability.
- Updated `tsconfig.json` compiler options to enable strict compiler options (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- Replaced untyped `any` castings throughout hook lifecycle with strict type guards (`isAbortError`, `isTimeoutError`, `getErrorStatus`).

---

## [0.5.0] - 2026-10-27

### Added
- **Streaming Support (Phase 5)**: Enabled real-time chunk consumption via `ReadableStreamDefaultReader` and `TextDecoder`.
- Transitioned hook status dynamically to `'streaming'` while tokens accumulate in `data`.
- Added reader cancellation handler on user abort or unmount.

---

## [0.4.0] - 2026-10-23

### Added
- **Timeout Protection (Phase 4)**: Added `options.timeout` parameter in milliseconds.
- Introduced `AITimeoutError` class emitted when request duration exceeds timeout threshold.
- Added `isTimeout` boolean flag to `UseAIReturn`.

---

## [0.3.0] - 2026-10-23

### Added
- **Exponential Backoff Retries (Phase 3)**: Implemented configurable retry loops with `options.retry` and `options.retryDelay`.
- Filtered retries for transient server errors (`408`, `429`, `500`, `502`, `503`, `504`) while immediately failing on client errors (`4xx`).
- Added `retryAttempt` count indicator to hook return object.
- Made backoff sleep abortable on cancellation or component teardown.

---

## [0.2.0] - 2026-10-21

### Added
- **Abortable Lifecycles (Phase 2)**: Integrated `AbortController` for manual cancellation via `cancel()`.
- Added automatic unmount cleanup to abort pending network fetches.
- Introduced `'cancelled'` status state and `isCancelled` flag.

---

## [0.1.0] - 2026-10-06

### Added
- **Initial Core State Machine (Phase 1)**: Initial implementation of `useAI` hook.
- Support for `idle`, `pending`, `success`, and `error` states.
- State reset capabilities via `reset()`.
