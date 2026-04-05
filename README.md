# ghostframe
Zero config skeleton loaders for React.

## Installation

```bash
pnpm add @ghostframe/ghostframe
```

```ts
import { AutoSkeleton } from "@ghostframe/ghostframe";
import { generateStaticBlueprint } from "@ghostframe/ghostframe/runtime";
```

## Build-Time Capture (Phase 3 MVP)

Generate demo manifest artifacts with:

```bash
pnpm capture:demo
```

This command runs `ghostframe capture` with `apps/demo/ghostframe.capture.config.mjs` and emits:

- `apps/demo/lib/ghostframe/generated/manifest.json`
- `apps/demo/lib/ghostframe/generated/manifest-loader.ts`
- `apps/demo/lib/ghostframe/generated/capture-report.txt`

## CI Quality Gates

Run the full quality gate locally with:

```bash
pnpm quality:gate
```

This executes:

- `ghostframe validate` to enforce schema, required key coverage derived from the captured manifest entries, invalid-entry budget, and artifact size.
- `ghostframe diff` to produce deterministic drift output. In CI, pull requests diff the candidate manifest against the base branch snapshot.
- `ghostframe report` to aggregate human/json outputs for CI.

Artifacts are written to `.tmp/ghostframe/`.
