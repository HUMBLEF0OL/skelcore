---
name: ssr-generator
description: Best-effort React element tree analysis for server-side skeleton generation.
---

# SSR Skeleton Generator Skill

This skill provides directions for generating an `autoskeleton` blueprint from a React element tree during SSR (Server-Side Rendering) or in RSC (React Server Components).

## Key Concept: Static Analysis
Without DOM, we rely on React element types, props, and tag names to infer the structure and dimensions of the skeleton.

### Workflow: Static Analysis Pass
1. Walk the React element tree recursively (`React.Children.forEach`).
2. Identify element types (e.g., `'img'`, `'button'`, custom components).
3. Extract explicit sizing props (`width`, `height`, `style.width`, `style.height`).
4. Read `data-skeleton-w` and `data-skeleton-h` overrides if present.
5. Apply **Heuristic Dimensions** for unspecified sizes based on roles (e.g., `text: 200x16`, `image: 300x200`).
6. Generate a `Blueprint` with `source: 'static'`.

## Limitations
- Static analysis is not pixel-perfect.
- It cannot detect computed styles or responsive layout shifts.
- It should be replaced by the `Dynamic Analyzer` upon hydration.

## Guidelines
- Ensure the static blueprint is JSON-serializable.
- Exclude elements with `data-no-skeleton`.
- Use `React.Children` and `typeof element.type === 'string'` for tag identification.
