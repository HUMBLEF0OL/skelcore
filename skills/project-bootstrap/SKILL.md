---
name: project-bootstrap
description: Instructions for setting up and managing the monorepo for SkelCore v2 (autoskeleton).
---

# Project Bootstrap Skill

This skill guides the initialization and management of the `autoskeleton` monorepo using `pnpm`, `Turborepo`, and `Changesets`.

## Core Technologies
- **Package Manager**: `pnpm`
- **Monorepo Manager**: `Turborepo`
- **Build Tool**: `tsup`
- **Versioning**: `Changesets`

## Workflow: Phase 0 Setup

### 1. Initialize PNPM Workspace
Ensure Node.js ≥ 20. Create `pnpm-workspace.yaml` in the root:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### 2. Configure Turborepo
Create `turbo.json` in the root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    }
  }
}
```

### 3. Setup Changesets
Run `npx changeset init` to initialize the changesets configuration.

### 4. Linting & Formatting
Use ESLint flat config and Prettier. Enforce consistent code style across all packages.

## Guidelines
- Always use `"type": "module"` in `package.json`.
- Ensure dual CJS/ESM output via `tsup`.
- Keep the `@autoskeleton/core` package ≤ 6 KB gzip.
