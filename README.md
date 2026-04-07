# ghostframes
Zero config skeleton loaders for React.

Ghostframes now ships as a single public package: `@ghostframes/runtime`.

## Installation

```bash
pnpm add @ghostframes/runtime
```

```ts
import { AutoSkeleton } from "@ghostframes/runtime";
import { generateStaticBlueprint } from "@ghostframes/runtime";
```

## Build-Time Capture (Phase 3 MVP)

Generate demo manifest artifacts with:

```bash
pnpm capture:demo
```

This command runs the `ghostframes` binary with `apps/demo/ghostframes.capture.config.mjs` and emits:

- `apps/demo/lib/ghostframes/generated/manifest.json`
- `apps/demo/lib/ghostframes/generated/manifest-loader.ts`
- `apps/demo/lib/ghostframes/generated/capture-report.txt`

Build now also generates artifacts automatically:

```bash
pnpm build
```

Developer-focused generation command:

```bash
pnpm skeleton:generate:dev
```

## CI Quality Gates

Run the full quality gate locally with:

```bash
pnpm quality:gate
```

This executes:

- `ghostframes validate` to enforce schema, required key coverage derived from the captured manifest entries, invalid-entry budget, and artifact size.
- `ghostframes diff` to produce deterministic drift output. In CI, pull requests diff the candidate manifest against the base branch snapshot.
- `ghostframes report` to aggregate human/json outputs for CI.

Artifacts are written to `.tmp/ghostframes/`.

## Layered Workflow

- Build/dev layer: generate artifacts locally (`pnpm build`, `pnpm skeleton:generate:dev`).
- CI layer: verify artifacts and enforce promotion gates (`pnpm quality:verify-artifacts`, `pnpm quality:gate`).
- Deploy layer: run quick artifact sanity checks (`pnpm deploy:sanity`).
