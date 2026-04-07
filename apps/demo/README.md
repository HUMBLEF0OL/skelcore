# Ghostframes Demo

A comprehensive Next.js demonstration of `@ghostframes/runtime` features and customization options.

## Running the Demo

```bash
# Start development server
pnpm dev

# Open http://localhost:3005
```

## End-to-End Skeleton Workflow

The demo now covers full workflow layers:

- Build/dev layer generates artifacts locally.
- CI layer validates gates and blocks stale/invalid artifacts.
- Deploy layer runs quick sanity checks against verified artifacts.

### Local demonstration sequence

```bash
# Build packages and generate demo artifacts
pnpm build

# Optional: regenerate while actively developing
pnpm skeleton:generate:dev

# Validate generated artifact integrity
pnpm quality:verify-artifacts

# Run full quality + promotion gates
pnpm quality:gate

# Deploy-time quick sanity checks
pnpm deploy:sanity
```

### Guide page covering this flow

- `/reference/cli-workflow`

## Demo Sections

The demo showcases 13 use-cases covering basic to advanced Ghostframes features:

### Core Features (Sections 1-8)

1. **Profile Card** — Avatar + heading + tags. Single component wrapping with `remeasureOnResize`.
2. **Article Feed** — Repeating cards in parallel. Independent `AutoSkeleton` wrappers for concurrent skeleton loading.
3. **Data Table** — Complex table with multiple column types. Preserves row/column structure automatically.
4. **Image Grid** — Aspect-ratio media tiles with correct placeholder dimensions.
5. **data-no-skeleton** — Header stays interactive during loading via `data-no-skeleton` attribute.
6. **Stats Grid** — Dense metric cards with varied typography. Automatic role inference.
7. **Animation Modes** — Side-by-side comparison of `shimmer`, `pulse`, and `none` animations.
8. **Custom Config** — Override `baseColor`, `highlightColor`, `borderRadius`, and `speed` per section.

### Advanced Customization (Sections 9-13)

9. **Overlay Styling** — Custom skeleton appearance using `overlayClassName` and `overlayStyle` props. Apply CSS classes or inline styles directly to the overlay container.

10. **Include/Exclude Filtering** — Selective skeleton generation using:
    - `include`/`exclude` matchers with selector, role, and predicate support
    - `data-skeleton-include` and `data-skeleton-exclude` DOM attributes
    - Demonstrate buttons staying interactive while content loads

11. **Custom Animation Registry** — Define proprietary animations via `animationRegistry`:
    - Register keyed animation definitions
    - Set custom keyframes, className, and timing independent of built-in presets
    - Override via `animationPreset` prop

12. **Placeholder Schema** — Declarative placeholder definitions:
    - `placeholderStrategy="schema"`
    - Skip dynamic measurement with exact block dimensions, roles, and repetition
    - Useful for known, high-frequency layouts

13. **Placeholder Slots** — Custom React components as placeholders:
    - `placeholderStrategy="slots"`
    - Render branded, animated custom loading UI
    - Full control over placeholder appearance

## Key Pages

- **`/`** — Main showcase (this list)
- **`/reference`** — Feature documentation and configuration reference
- **`/reference/cli-workflow`** — Build/dev generation, CI validation, deploy sanity, and rollout env template
- **`/advanced/form-loading`** — Advanced form loading patterns
- **`/config-playground`** — Interactive configuration explorer
- **`/test`** — E2E test bench

## Learn More

- [Workspace README](../../README.md)
- [Runtime Package Docs](../../packages/ghostframes/README.md)
- [Package Implementation Notes](../../packages/react/README.md)
- [Core Engine Notes](../../packages/core/README.md)
- [Unified Package Plan](../../docs/UNIFIED_PACKAGE_PLAN.md)
