# skelcore

Zero config skeleton loaders for React.

Automatically measures your real UI and generates pixel-perfect, zero-layout-shift skeleton overlays. Production-ready with SSR, caching, custom animations, and advanced placeholder controls.

## Features

- 🎯 **Auto-measuring** — Reads computed styles, fonts, layout, and dimensions from the real DOM
- ⚡ **Zero config** — Works out of the box with `<AutoSkeleton loading={...}>`
- 🔒 **Zero layout shift** — Skeletons match exact dimensions and positioning
- 📦 **Tiny** — Under 10 KB minzipped; zero runtime dependencies beyond React
- ✨ **3 animations** — `shimmer` (default), `pulse`, or custom registry
- 🎨 **Customizable** — Overlay styling, per-element include/exclude, custom animations
- 🗂️ **SSR-ready** — Generate blueprints server-side with `generateStaticBlueprint`
- 🚀 **Performant** — Blueprint caching, structural hash validation, measurement budget control
- ♿ **Accessible** — Correct `aria-busy`, `aria-hidden`, and motion preferences

## Packages

- [`@skelcore/core`](packages/core/) — Framework-agnostic analysis engine and types
- [`@skelcore/react`](packages/react/) — React component and hooks

## Quickstart

```bash
npm install @skelcore/react
```

```tsx
import { AutoSkeleton } from "@skelcore/react";

export function UserCard({ id }: { id: string }) {
  const { user, loading } = useUser(id);

  return (
    <AutoSkeleton loading={loading}>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </AutoSkeleton>
  );
}
```

## Customization

### Overlay Styling
```tsx
<AutoSkeleton
  loading={loading}
  overlayClassName="shadow-lg ring-2 ring-blue-400"
  overlayStyle={{ borderRadius: "0.75rem" }}
>
  <YourComponent />
</AutoSkeleton>
```

### Include/Exclude Elements
```tsx
<AutoSkeleton
  loading={loading}
  exclude={[{ selector: "[data-skeleton-exclude]" }]}
>
  <YourComponent />
</AutoSkeleton>
```

### Custom Animations
```tsx
<AutoSkeleton
  loading={loading}
  animationPreset="bounce"
  animationRegistry={{
    bounce: {
      className: "animate-bounce",
      durationMs: 1000,
    }
  }}
>
  <YourComponent />
</AutoSkeleton>
```

### Placeholder Strategies
```tsx
// Schema-driven placeholders
<AutoSkeleton
  loading={loading}
  placeholderStrategy="schema"
  placeholderSchema={{
    blocks: [
      { role: "avatar", width: 40, height: 40, borderRadius: "50%" },
      { role: "text", width: 200, height: 16 },
    ]
  }}
>
  <YourComponent />
</AutoSkeleton>

// Custom slot placeholders
<AutoSkeleton
  loading={loading}
  placeholderStrategy="slots"
  placeholderSlots={{
    custom: () => <CustomLoadingUI />
  }}
>
  <YourComponent />
</AutoSkeleton>
```

## Documentation

- [Migration Guide](docs/migration-guide.md) — Adoption paths and quick customization
- [Release Checklist](docs/release-checklist.md) — Testing matrix and rollout steps
- [Live Demo](https://skelcore.vercel.app/) — Interactive feature showcase with 13 use-cases

## Architecture

SkelCore operates in phases:

1. **Measuring** — Renders your children invisibly, reads DOM metrics
2. **Showing** — Overlays skeleton while content is hidden
3. **Exiting** — Fades skeleton out as `loading` → `false`

Blueprints are cached by structural hash, so re-rendering identical DOM structures skips re-measurement.

## Deployment

The demo is deployed at [skelcore.vercel.app](https://skelcore.vercel.app/).

## Release Docs

- [Migration guide](docs/migration-guide.md) for no-change, quick customization, and advanced SSR/perf adoption paths.
- [Release checklist](docs/release-checklist.md) for the regression matrix, demo smoke checks, and canary-to-stable rollout steps.
