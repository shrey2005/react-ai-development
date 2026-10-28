# Contributing to @shrey/react-ai

Thank you for your interest in contributing to `@shrey/react-ai`! We welcome contributions, bug reports, feature suggestions, and documentation improvements.

---

## Code of Conduct

Please help us foster an open, welcoming, and inclusive community. Be respectful and collaborative in all issues, discussions, and pull requests.

---

## Development Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on Node 20+ and 24+)
- **npm**: `v9.0.0` or higher
- **Git**

---

## Workspace Structure

The project is structured as an npm workspaces monorepo:

```text
react-ai-development/
├── apps/
│   └── demo/             # Vite + React 18 integration demo
├── backend/              # FastAPI test backend with streaming endpoint
└── packages/
    └── react-ai/         # Core library package (@shrey/react-ai)
        ├── src/          # TypeScript source code
        ├── test/         # Vitest test suite
        ├── dist/         # Compiled ESM/CJS and .d.ts artifacts
        ├── package.json  # Library metadata and export configuration
        ├── tsup.config.ts # Library build tooling configuration
        └── tsconfig.json # TypeScript strict compiler settings
```

---

## Development Workflow

### 1. Installation

From the monorepo root:

```bash
npm install
```

### 2. Compilation (Dual ESM / CJS)

To build the library using `tsup`:

```bash
npm run build --workspace=packages/react-ai
```

This compiles:
- `dist/index.js` (ESM)
- `dist/index.cjs` (CommonJS)
- `dist/index.d.ts` (ESM TypeScript declarations)
- `dist/index.d.cts` (CJS TypeScript declarations)

For watch mode during development:

```bash
npm run dev --workspace=packages/react-ai
```

### 3. Testing & Coverage

Run the Vitest test suite:

```bash
npm run test --workspace=packages/react-ai
```

To run tests with code coverage report (v8):

```bash
npm run test:coverage --workspace=packages/react-ai
```

> All PRs must maintain >90% branch and statement coverage.

### 4. Type Checking

Validate TypeScript types in strict mode:

```bash
npm run typecheck --workspace=packages/react-ai
```

### 5. Linting

Verify code quality with ESLint:

```bash
npm run lint --workspace=packages/react-ai
```

### 6. Packaging & Distribution Verification

Before opening a pull request or preparing a release, verify that the package tarball contains only necessary artifacts:

```bash
npm pack --dry-run --workspace=packages/react-ai
```

Verify that only:
- `dist/` artifacts (`.js`, `.cjs`, `.d.ts`, `.d.cts`, and sourcemaps)
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

are included in the tarball contents.

---

## Commit Guidelines

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` Introduces a new feature or capability.
- `fix:` Patches a bug or resolves an unexpected behavior.
- `docs:` Documentation-only changes.
- `test:` Adds or modifies unit and integration tests.
- `refactor:` Code restructuring without changing behavior.
- `chore:` Maintenance tasks, dependency updates, or build tooling changes.

Example:
```bash
git commit -m "feat(streaming): support custom text decoders in ReadableStream reader"
```

---

## Pull Request Process

1. Fork or branch from `main`.
2. Implement your changes adhering to existing design patterns and TypeScript strict mode.
3. Ensure all tests, typecheck, linting, and build steps pass:
   ```bash
   npm run lint --workspace=packages/react-ai
   npm run typecheck --workspace=packages/react-ai
   npm run test:coverage --workspace=packages/react-ai
   npm run build --workspace=packages/react-ai
   ```
4. Update `CHANGELOG.md` under `[Unreleased]` with a concise description of your changes.
5. Submit your pull request with a descriptive title and detailed summary.
