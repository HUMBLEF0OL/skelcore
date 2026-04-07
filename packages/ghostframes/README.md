# @ghostframes/runtime

> Unified runtime package that re-exports the React facade and CLI entry points.

[![npm version](https://img.shields.io/npm/v/@ghostframes/runtime)](https://www.npmjs.com/package/@ghostframes/runtime)
[![license](https://img.shields.io/npm/l/@ghostframes/runtime)](../../LICENSE)

`@ghostframes/runtime` is the package to install in application projects. It re-exports the React APIs from `@ghostframes/react` and ships a `ghostframes` CLI binary for capture/report workflows.

## Installation

```bash
# npm
npm install @ghostframes/runtime

# pnpm
pnpm add @ghostframes/runtime

# yarn
yarn add @ghostframes/runtime
```

## React Usage

```tsx
import { AutoSkeleton } from "@ghostframes/runtime";

function UserCard({ loading }: { loading: boolean }) {
  return (
    <AutoSkeleton loading={loading}>
      <article>
        <h2>Profile</h2>
        <p>Runtime facade over @ghostframes/react.</p>
      </article>
    </AutoSkeleton>
  );
}
```

## CLI Usage

The package exposes a `ghostframes` command:

```bash
ghostframes capture --config ghostframes.capture.config.mjs
ghostframes validate --manifest .ghostframes/generated/manifest.json --json-out .ghostframes/validate.json
ghostframes report --validate-json .ghostframes/validate.json --diff-json .ghostframes/diff.json
```

Run these commands in order in your consumer app:

1. `capture`: visits routes in your config and generates Ghostframes artifacts.
2. `validate`: checks the generated manifest for schema and quality thresholds.
3. `report`: combines machine-readable outputs (validate/diff) into a CI-friendly summary.

### What Each Command Needs

- `ghostframes capture --config <path-to-capture-config>`
  - Use when: creating or refreshing generated artifacts.
  - Requires: a capture config and a running app at the configured base URL.
  - Produces: manifest and related generated files (for example under `.ghostframes/generated/`).

- `ghostframes validate --manifest <path-to-manifest> --json-out <path-to-validate-json>`
  - Use when: enforcing manifest quality gates.
  - Requires: a manifest file produced by `capture`.
  - Produces: terminal output plus JSON output used by `report`.

- `ghostframes report --validate-json <path-to-validate-json> --diff-json <path-to-diff-json>`
  - Use when: creating one final quality report for local checks or CI.
  - Requires: validate JSON and (optionally, if your workflow includes diff checks) diff JSON.
  - Produces: consolidated text/json report output.

## Internal Packages

The runtime package bundles the public consumer surface. The split packages below are internal implementation details for the repository:

- `@ghostframes/react`: React adapter implementation re-exported by `@ghostframes/runtime`.
- `@ghostframes/core`: framework-agnostic engine used under the runtime facade.
- `@ghostframes/cli`: CLI implementation that powers the `ghostframes` binary.
