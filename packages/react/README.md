# @ghostframe/ghostframe

> Automatic, zero-configuration skeleton loading states for React — powered by live DOM measurement.

[![npm version](https://img.shields.io/npm/v/@ghostframe/ghostframe)](https://www.npmjs.com/package/@ghostframe/ghostframe)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@ghostframe/ghostframe)](https://bundlephobia.com/package/@ghostframe/ghostframe)
[![license](https://img.shields.io/npm/l/@ghostframe/ghostframe)](../../LICENSE)

`@ghostframe/ghostframe` wraps Ghostframe's engine with idiomatic React components and a hook. It measures your real UI — fonts, layout, borders, media — and replaces it with a pixel-perfect skeleton overlay while data loads. No manual schema. No configuration required to get started.

**[→ Live Demo](https://ghostframe.vercel.app/)**

---

## Features

-  **Auto-measures real DOM** — reads computed styles, bounding rects, and font metrics after layout
-  **Zero-config** — wrap any component with `<AutoSkeleton loading={...}>` and it works
-  **Composable** — use `SkeletonRenderer` to render pre-built blueprints, or `useAutoSkeleton` for custom integrations
-  **SSR-compatible** — generate blueprints server-side with `generateStaticBlueprint` (no DOM required)
-  **Structural hash caching** — avoids re-measuring when DOM structure hasn't changed
-  **3 animation modes** — `shimmer` (default), `pulse`, or `none`
-  **Extensible animation presets** — register custom presets without forking internals
-  **Placeholder strategies** — choose between `auto`, `schema`, or `slots` for loading UIs
-  **Accessible** — sets `aria-busy` and `aria-hidden` correctly; respects `prefers-reduced-motion`
-  **Tiny** — under 10 KB minzipped; no runtime dependencies beyond React

---

## Requirements

| Peer Dependency | Version  |
|----------------|----------|
| `react`        | `>= 18`  |
| `react-dom`    | `>= 18`  |

---

## Installation

```bash
# npm
npm install @ghostframe/ghostframe

# pnpm
pnpm add @ghostframe/ghostframe

# yarn
yarn add @ghostframe/ghostframe
```


---

## Quick Start

```tsx
import { AutoSkeleton } from "@ghostframe/ghostframe";

function UserCard({ userId }: { userId: string }) {
  const { user, loading } = useUser(userId);

  return (
    <AutoSkeleton loading={loading}>
      <div className="card">
        <img src={user.avatar} className="avatar" />
        <h2>{user.name}</h2>
        <p>{user.bio}</p>
        <button>Follow</button>
      </div>
    </AutoSkeleton>
  );
}
```

When `loading` is `true`, `AutoSkeleton` measures the rendered children and overlays a matching skeleton. When `loading` becomes `false`, the skeleton fades out and the real content is revealed.

---

## Exports

Everything is exported from the single package entry point:

```ts
import {
  // Components
  AutoSkeleton,
  SkeletonRenderer,

  // Hook
  useAutoSkeleton,

  // Core types (re-exported from @ghostframe/ghostframe/runtime)
  type AutoSkeletonProps,
  type SkeletonRendererProps,
  type SkeletonPhase,
  type SkeletonConfig,
  type Blueprint,
  type BlueprintNode,
  type SkeletonRole,
  type AnimationMode,

  // Core utilities (re-exported from @ghostframe/ghostframe/runtime)
  DEFAULT_CONFIG,
  generateStaticBlueprint,
  generateDynamicBlueprint,
  blueprintCache,
  computeStructuralHash,
  animationSystem,
} from "@ghostframe/ghostframe";
```

---

## Component: `AutoSkeleton`

The **primary component**. It wraps your content, measures it while loading, and renders a skeleton overlay.

```tsx
<AutoSkeleton loading={isLoading}>
  {/* your real UI */}
</AutoSkeleton>
```

### Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `loading` | `boolean` | ✅ | — | When `true`, the skeleton is shown. When it switches to `false`, the content fades in. |
| `children` | `React.ReactNode` | ✅ | — | The real UI to measure and eventually show. |
| `config` | `Partial<SkeletonConfig>` | ❌ | `DEFAULT_CONFIG` | Override any subset of the configuration. Merged with defaults. |
| `blueprint` | `Blueprint` | ❌ | `undefined` | A pre-computed blueprint (e.g. from SSR). Skips DOM measurement entirely. |
| `hydrateBlueprint` | `Blueprint` | ❌ | `undefined` | SSR/edge blueprint candidate validated on the client before reuse. |
| `blueprintSource` | `"client" \| "server" \| "cache"` | ❌ | `"client"` | Declares where `hydrateBlueprint` originated so validation and fallback rules can be applied. |
| `onBlueprintInvalidated` | `(reason) => void` | ❌ | `undefined` | Called when hydrated blueprint validation fails and SkelCore falls back to measurement. |
| `measurementPolicy` | `{ mode: "eager" \| "idle" \| "viewport" \| "manual"; budgetMs?: number }` | ❌ | `{ mode: "eager" }` | Controls when measurement starts and optionally caps analyzer work budget per run. |
| `blueprintCachePolicy` | `{ ttlMs?: number; version?: number }` | ❌ | `undefined` | Optional TTL/version gates for cache and hydration blueprint reuse. |
| `fallback` | `React.ReactNode` | ❌ | `undefined` | Shown only during the first measurement pass, before a blueprint is ready. |
| `slots` | `Record<string, () => React.ReactNode>` | ❌ | `{}` | Custom slot renderers keyed by `data-skeleton-slot` value. |
| `onMeasured` | `(blueprint: Blueprint) => void` | ❌ | `undefined` | Callback fired each time a new blueprint is computed. Useful for caching or debugging. |
| `remeasureOnResize` | `boolean` | ❌ | `false` | Re-measures and updates the skeleton whenever the container is resized. |
| `overlayClassName` | `string` | ❌ | `undefined` | Extra class name applied to the skeleton overlay container. |
| `overlayStyle` | `React.CSSProperties` | ❌ | `undefined` | Inline styles merged onto the skeleton overlay container. |
| `include` | `ElementMatcher[]` | ❌ | `undefined` | Optional include matcher list for analyzer traversal. |
| `exclude` | `ElementMatcher[]` | ❌ | `undefined` | Optional exclude matcher list; takes precedence over include. |
| `placeholderStrategy` | `"none" \| "auto" \| "schema" \| "slots"` | ❌ | `"none"` | Placeholder mode selector. `none`/`auto` use analyzer-driven skeletons. |
| `placeholderSchema` | `PlaceholderSchema` | ❌ | `undefined` | Schema blocks used when strategy is `schema` (or as first choice in `slots`). |
| `placeholderSlots` | `Record<string, () => React.ReactNode>` | ❌ | `undefined` | Slot placeholders used in `slots` strategy; merged with `slots`. |
| `animationPreset` | `"pulse" \| "shimmer" \| "none" \| string` | ❌ | `config.animation` | Animation preset override for renderer nodes. |
| `animationRegistry` | `Record<string, SkeletonAnimationDefinition>` | ❌ | `undefined` | Registry of custom animation presets. |

### Skeleton Phases

`AutoSkeleton` internally transitions through these phases:

| Phase | Description |
|-------|-------------|
| `idle` | Not loading. Content is visible. |
| `measuring` | `loading` is `true`. Children are rendered (but hidden) so the DOM can be measured. |
| `showing` | Blueprint is ready. Skeleton overlay is visible on top of hidden content. |
| `exiting` | `loading` flipped to `false`. Skeleton fades out over `config.transitionDuration` ms. |

### CSS Classes Injected

`AutoSkeleton` applies these class names to its internal structure:

| Class | Element | Purpose |
|-------|---------|---------|
| `.skel-auto-container` | Root wrapper `<div>` | The measurement anchor |
| `.skel-content` | Children wrapper | Hidden during skeleton display |
| `.skel-overlay` | Skeleton wrapper | Absolute overlay containing `SkeletonRenderer` |
| `.skel-fallback` | Fallback wrapper | Visible only before the first blueprint is ready |

### Overlay styling hooks

```tsx
<AutoSkeleton
  loading={loading}
  overlayClassName="card-skeleton-overlay"
  overlayStyle={{ backdropFilter: "blur(2px)" }}
>
  <Card />
</AutoSkeleton>
```

### Per-element include/exclude controls

```tsx
<AutoSkeleton
  loading={loading}
  include={[{ selector: ".skeleton-target" }]}
  exclude={[{ selector: ".skeleton-ignore" }]}
>
  <Card />
</AutoSkeleton>
```

You can also use DOM attributes directly:

- `data-skeleton-include`
- `data-skeleton-exclude`

`exclude` and `data-skeleton-exclude` always win over include rules.

### Placeholder strategies

```tsx
<AutoSkeleton
  loading={loading}
  placeholderStrategy="schema"
  placeholderSchema={{
    blocks: [
      { role: "text", width: 220, height: 16, repeat: 2 },
      { role: "custom", width: 220, height: 48, slotKey: "cta" },
    ],
  }}
  placeholderSlots={{
    cta: () => <div className="cta-skeleton" />,
  }}
>
  <Card />
</AutoSkeleton>
```

Precedence:
- `placeholderStrategy="schema"`: valid `placeholderSchema` is required, otherwise falls back to analyzer behavior.
- `placeholderStrategy="slots"`: uses `placeholderSchema` first when valid; otherwise builds placeholders from `placeholderSlots` keys.
- `placeholderStrategy="none"` and `"auto"`: use existing analyzer-driven behavior.

### Animation registry

```tsx
<AutoSkeleton
  loading={loading}
  animationPreset="brandPulse"
  animationRegistry={{
    brandPulse: {
      className: "brand-pulse",
      keyframes: "0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; }",
      durationMs: 900,
      inlineStyle: { opacity: 0.9 },
    },
  }}
>
  <Card />
</AutoSkeleton>
```

Resolution order:
- custom `animationRegistry` hit
- built-in preset (`pulse`, `shimmer`, `none`)
- fallback to no animation for unknown presets

### Recommended SSR pipeline (Next.js)

```tsx
// Server-side (RSC or route handler)
import { generateStaticBlueprint } from "@skelcore/core";

const serverBlueprint = generateStaticBlueprint(
  <article>
    <h3>Build once, reuse everywhere</h3>
    <p>Serialize loading structure on the server.</p>
  </article>
);

// Client component
import { AutoSkeleton } from "@skelcore/react";

<AutoSkeleton
  loading={loading}
  hydrateBlueprint={serverBlueprint}
  blueprintSource="server"
  blueprintCachePolicy={{ version: 1, ttlMs: 5 * 60_000 }}
  measurementPolicy={{ mode: "idle", budgetMs: 12 }}
  onBlueprintInvalidated={(reason) => {
    console.warn("Hydrated blueprint invalidated:", reason);
  }}
>
  <ProductCard />
</AutoSkeleton>;
```

Policy guidance:
- Use `mode: "eager"` for above-the-fold critical content.
- Use `mode: "idle"` for non-critical sections where responsiveness matters more than immediate skeleton paint.
- Use `mode: "viewport"` for below-the-fold blocks.
- Use `mode: "manual"` with the `useAutoSkeleton` hook when your app controls the exact measurement trigger.

---

## Component: `SkeletonRenderer`

A **pure rendering component** that converts a `Blueprint` into DOM elements. Use it when you want to render a blueprint yourself without the measurement logic of `AutoSkeleton`.

```tsx
import { SkeletonRenderer } from "@ghostframe/ghostframe";
import { generateStaticBlueprint } from "@ghostframe/ghostframe";

const blueprint = generateStaticBlueprint(
  <div>
    <img />
    <h2>Name</h2>
    <p>Description</p>
  </div>
);

function MySkeleton() {
  return (
    <SkeletonRenderer
      blueprint={blueprint}
      config={DEFAULT_CONFIG}
      mode="flow"
    />
  );
}
```

### SkeletonRenderer Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `blueprint` | `Blueprint` | ✅ | — | The blueprint to render. |
| `config` | `SkeletonConfig` | ✅ | — | Full config object (not partial). |
| `mode` | `"flow" \| "absolute"` | ❌ | `"absolute"` | How skeleton nodes are positioned. See [Rendering Modes](#rendering-modes). |
| `slots` | `Record<string, () => React.ReactNode>` | ❌ | `{}` | Custom slot renderers for nodes with `role: "custom"`. |
| `animationPreset` | `"pulse" \| "shimmer" \| "none" \| string` | ❌ | `config.animation` | Animation preset override for this renderer instance. |
| `animationRegistry` | `Record<string, SkeletonAnimationDefinition>` | ❌ | `{}` | Registry for custom animation definitions. |

### Rendering Modes

| Mode | Description | When to use |
|------|-------------|-------------|
| `"absolute"` | Each skeleton node is placed using `position: absolute` with pixel-precise `top`, `left`, `width`, and `height` taken from the measured DOM. | Dynamic blueprints produced by `generateDynamicBlueprint` (the default for `AutoSkeleton`). |
| `"flow"` | Nodes are rendered with `position: relative` and flow layout, honoring `layout` props like `flexDirection`, `gap`, and `padding`. | Static blueprints produced by `generateStaticBlueprint` (SSR-safe, no DOM needed). |

---

## Hook: `useAutoSkeleton`

The **low-level hook** that powers `AutoSkeleton`. Use it to build completely custom skeleton UIs.

```tsx
import { useRef } from "react";
import { useAutoSkeleton, SkeletonRenderer, DEFAULT_CONFIG } from "@ghostframe/ghostframe";

function CustomSkeleton({ loading }: { loading: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, ref, DEFAULT_CONFIG, {
    remeasureOnResize: true,
    onMeasured: (b) => console.log("Blueprint ready:", b),
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <MyContent />
      {blueprint && phase !== "idle" && (
        <SkeletonRenderer blueprint={blueprint} config={DEFAULT_CONFIG} />
      )}
    </div>
  );
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `loading` | `boolean` | — | Drives the skeleton lifecycle. |
| `contentRef` | `React.RefObject<HTMLElement \| null>` | — | Ref attached to the element whose children will be measured. |
| `config` | `SkeletonConfig` | `DEFAULT_CONFIG` | Full config object. |
| `options.onMeasured` | `(b: Blueprint) => void` | `undefined` | Called after each successful measurement. |
| `options.remeasureOnResize` | `boolean` | `false` | Attach a `ResizeObserver` and re-measure when the container size changes. |
| `options.externalBlueprint` | `Blueprint` | `undefined` | Skip measurement entirely; use this pre-computed blueprint instead. |

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `blueprint` | `Blueprint \| null` | The current blueprint. `null` while measuring or after the skeleton exits. |
| `phase` | `SkeletonPhase` | One of `"idle"`, `"measuring"`, `"showing"`, `"exiting"`. |

---

## Configuration: `SkeletonConfig`

All visual and behavioral options are controlled through the `SkeletonConfig` object. Pass any subset as `config` on `AutoSkeleton` or `useAutoSkeleton`.

### Full Config Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animation` | `"shimmer" \| "pulse" \| "none"` | `"shimmer"` | Animation style applied to skeleton blocks. |
| `baseColor` | `string` | `"var(--skeleton-base, #e0e0e0)"` | CSS color for the skeleton block background. Supports CSS variables. |
| `highlightColor` | `string` | `"var(--skeleton-highlight, #f5f5f5)"` | CSS color for the shimmer highlight. Only used when `animation` is `"shimmer"`. |
| `borderRadius` | `number` | `4` | Pixel border radius applied to all non-avatar skeleton blocks. |
| `speed` | `number` | `1` | Animation speed multiplier. `2` = twice as fast. Minimum `0.1`. |
| `minTextHeight` | `number` | `12` | Minimum height in px for each text line bar. |
| `maxDepth` | `number` | `12` | Maximum DOM traversal depth during measurement. Larger trees may need this increased. |
| `lastLineRatio` | `number` | `0.7` | Width ratio for the last line in a multi-line text block (0–1). |
| `iconMaxSize` | `number` | `32` | SVG elements smaller than this (px) are classified as `icon`. Larger ones are re-evaluated. |
| `minImageArea` | `number` | `900` | Minimum area in px² for an element to be classified as `image`. |
| `transitionDuration` | `number` | `300` | Duration in ms of the skeleton fade-out when `loading` becomes `false`. |
| `tableCellInsetX` | `number` | `8` | Horizontal padding in px for the skeleton bar rendered inside a table cell. |
| `tableCellBarHeightRatio` | `number` | `0.45` | Height of the table-cell bar as a ratio of the cell height. |
| `tableCellBarMinHeight` | `number` | `6` | Minimum height in px for table cell skeleton bars. |
| `tableCellDefaultWidthRatio` | `number` | `0.7` | Fallback width ratio (0–1) for table cell bars when no text width is inferred. |

### Default Values

```ts
import { DEFAULT_CONFIG } from "@ghostframe/ghostframe";

// DEFAULT_CONFIG equals:
{
  animation: "shimmer",
  baseColor: "var(--skeleton-base, #e0e0e0)",
  highlightColor: "var(--skeleton-highlight, #f5f5f5)",
  borderRadius: 4,
  speed: 1,
  minTextHeight: 12,
  maxDepth: 12,
  lastLineRatio: 0.7,
  iconMaxSize: 32,
  minImageArea: 900,
  transitionDuration: 300,
  tableCellInsetX: 8,
  tableCellBarHeightRatio: 0.45,
  tableCellBarMinHeight: 6,
  tableCellDefaultWidthRatio: 0.7,
}
```

### CSS Custom Properties

The animation system injects a `<style id="ghostframe-animations">` tag into `<head>` that exposes these CSS variables:

| Variable | Maps to config |
|----------|----------------|
| `--skel-base` | `config.baseColor` |
| `--skel-highlight` | `config.highlightColor` |
| `--skel-radius` | `config.borderRadius` |

You can also override `baseColor` and `highlightColor` via your own CSS variables:

```css
:root {
  --skeleton-base: #2a2a2a;       /* dark theme base */
  --skeleton-highlight: #3a3a3a;  /* dark theme shimmer */
}
```

---

## Data Attributes

Control skeleton behavior from markup without touching props.

| Attribute | Applied to | Effect |
|-----------|-----------|--------|
| `data-skeleton-ignore` | Any element | Exclude this element **and all its descendants** from skeleton measurement. |
| `data-no-skeleton` | Any element | Mark a section that should stay visually visible even while the skeleton overlay is active (e.g. a persistent header). |
| `data-skeleton-role="<role>"` | Any element | Force a specific [skeleton role](#skeleton-roles) (`text`, `image`, `avatar`, `icon`, `button`, `input`, `video`, `canvas`, `badge`, `custom`, `skip`). |
| `data-skeleton-slot="<key>"` | Any element | Designate this element as a custom slot. Rendered via the matching `slots` prop key. |
| `data-skeleton-w="<number>"` | Any element | Override the measured or default width (px) for static blueprints. |
| `data-skeleton-h="<number>"` | Any element | Override the measured or default height (px) for static blueprints. |

```tsx
<AutoSkeleton loading={loading}>
  <nav data-no-skeleton>
    {/* Always visible */}
  </nav>
  <section>
    <img src={avatar} data-skeleton-role="avatar" />
    <div data-skeleton-ignore>
      {/* Excluded from skeleton */}
    </div>
    <span data-skeleton-slot="badge" />
  </section>
</AutoSkeleton>
```

---

## Blueprint System

A **Blueprint** is the serializable data structure that describes what skeleton elements to render:

```ts
type Blueprint = {
  version: number;
  rootWidth: number;
  rootHeight: number;
  nodes: BlueprintNode[];
  structuralHash?: string;  // djb2 hash of DOM structure for cache invalidation
  generatedAt: number;      // Date.now()
  source: "static" | "dynamic";
};
```

### Dynamic Blueprints (default)

`AutoSkeleton` calls `generateDynamicBlueprint()` internally. This function:

1. **Collects** all visible DOM elements under the container ref (respecting `maxDepth` and ignore attributes)
2. **Reads** bounding rects and computed styles in a single batched pass (no layout thrashing)
3. **Infers** a role for each node using a weighted scoring system
4. **Builds** a tree of `BlueprintNode`s with absolute positions relative to the root
5. **Caches** the result keyed by a structural hash — subsequent loads skip re-measurement if DOM structure is unchanged

### Static Blueprints (SSR)

For server-rendered pages or when you want zero measurement delay, generate a blueprint from your JSX tree statically:

```tsx
import { generateStaticBlueprint } from "@ghostframe/ghostframe";

// No DOM required — works in Node.js / SSR
const blueprint = generateStaticBlueprint(
  <div style={{ display: "flex", gap: "12px" }}>
    <img style={{ width: 48, height: 48, borderRadius: "50%" }} />
    <div>
      <h2>Name</h2>
      <p>Bio text here</p>
    </div>
  </div>
);
```

Static blueprints use **flow** rendering mode and fall back to `STATIC_DEFAULTS` when explicit dimensions are missing:

| Role | Default Width | Default Height |
|------|--------------|----------------|
| `text` | 200px | 16px |
| `image` | 300px | 200px |
| `avatar` | 40px | 40px |
| `icon` | 24px | 24px |
| `button` | 120px | 36px |
| `input` | 240px | 40px |
| `video` | 400px | 225px |
| `canvas` | 300px | 150px |
| `badge` | 60px | 22px |

### Pre-computed / External Blueprints

Pass a pre-computed blueprint directly to skip DOM measurement:

```tsx
<AutoSkeleton
  loading={loading}
  blueprint={myPrecomputedBlueprint}
>
  {children}
</AutoSkeleton>
```

This is useful when you've serialized a blueprint from a previous session or generated it server-side.

---

## Skeleton Roles

Each measured element is assigned a **role** that determines how its skeleton block looks:

| Role | Visual | Inferred when... |
|------|--------|-----------------|
| `text` | Multi-line horizontal bars | `<p>`, `<h1>`–`<h6>`, `<span>`, `<li>`, `<a>` with text, or short text nodes |
| `image` | Solid rectangle | `<img>`, `<picture>`, or elements with background-image and sufficient area |
| `avatar` | Circular block | `<img>` or element with `border-radius >= 50%` and size 24–128px |
| `icon` | Small square block | `<svg>` smaller than `iconMaxSize`, or small square elements |
| `button` | Pill-shaped bar | `<button>`, `role="button"`, or short `<a>` |
| `input` | Rounded rectangle | `<input>`, `<textarea>`, `<select>` |
| `video` | Aspect-ratio rectangle | `<video>` |
| `canvas` | Rectangle | `<canvas>` |
| `badge` | Small pill | Small rounded element with short text |
| `custom` | Renders slot | Element with `data-skeleton-slot` attribute |
| `skip` | Nothing | Invisible, zero-size, or explicitly ignored elements |

You can override the inferred role with `data-skeleton-role`:

```html
<div data-skeleton-role="image" style="width:300px; height:200px">
  <!-- Custom image placeholder -->
</div>
```

---

## Custom Slots

Render any React content in place of a skeleton block using named slots:

```tsx
<AutoSkeleton
  loading={loading}
  slots={{
    "chart-placeholder": () => <ChartSkeleton />,
    "maps-placeholder": () => <MapsTile shimmer />,
  }}
>
  <div>
    <div data-skeleton-slot="chart-placeholder" style={{ width: 600, height: 300 }} />
    <div data-skeleton-slot="maps-placeholder" style={{ width: 400, height: 250 }} />
  </div>
</AutoSkeleton>
```

The slot function is called only when the skeleton is visible, so expensive renders are deferred.

---

## Advanced Patterns

### SSR / Next.js App Router

Mark the component as a Client Component (required because `AutoSkeleton` uses browser APIs):

```tsx
"use client";
// AutoSkeleton internally marks itself as "use client" as well

import { AutoSkeleton } from "@ghostframe/ghostframe";

export function ArticleCard({ article, loading }: Props) {
  return (
    <AutoSkeleton loading={loading}>
      <article>
        <img src={article.thumbnail} alt={article.title} />
        <h2>{article.title}</h2>
        <p>{article.excerpt}</p>
      </article>
    </AutoSkeleton>
  );
}
```

For RSC-compatible patterns, generate a static blueprint in a Server Component and pass it down:

```tsx
// server-component.tsx (no "use client")
import { generateStaticBlueprint } from "@ghostframe/ghostframe";
import { ClientCard } from "./client-card";

const cardBlueprint = generateStaticBlueprint(
  <div>
    <img style={{ width: 80, height: 80 }} />
    <h2>Title</h2>
    <p>Description</p>
  </div>
);

export function ServerWrapper() {
  return <ClientCard blueprint={cardBlueprint} />;
}

// client-card.tsx
"use client";
export function ClientCard({ blueprint }: { blueprint: Blueprint }) {
  const [loading, setLoading] = useState(true);
  return (
    <AutoSkeleton loading={loading} blueprint={blueprint}>
      {/* content */}
    </AutoSkeleton>
  );
}
```

### Resize-aware Skeletons

Enable re-measurement when the container dimensions change:

```tsx
<AutoSkeleton loading={loading} remeasureOnResize>
  <ResponsiveGrid items={items} />
</AutoSkeleton>
```

This attaches a `ResizeObserver` to the container. The skeleton will re-measure and update whenever the container width or height changes.

### Blueprint Extraction for Reuse

Use `onMeasured` to capture and cache blueprints once for performance:

```tsx
const [cachedBlueprint, setCachedBlueprint] = useState<Blueprint | undefined>();

<AutoSkeleton
  loading={loading}
  blueprint={cachedBlueprint}
  onMeasured={(b) => setCachedBlueprint(b)}
>
  {children}
</AutoSkeleton>
```

On first load, the DOM is measured and `onMeasured` fires. Subsequent loads use the cached blueprint immediately — no measurement delay.

### Fallback During First Measurement

Show a simpler loading indicator while the first blueprint is being computed:

```tsx
<AutoSkeleton
  loading={loading}
  fallback={<div className="spinner" />}
>
  <ComplexDashboard />
</AutoSkeleton>
```

The `fallback` is shown only during the `measuring` phase (the first time, before a blueprint exists). Once a blueprint is ready it's cached in memory, so subsequent loading states show the skeleton immediately.

### Tables

Tables are handled automatically. `SkeletonRenderer` renders correct semantic tags in `flow` mode and injects inset content bars into table cells:

```tsx
<AutoSkeleton loading={loading}>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.status}</td>
          <td>{row.date}</td>
        </tr>
      ))}
    </tbody>
  </table>
</AutoSkeleton>
```

Control table cell skeleton appearance via config:

```tsx
<AutoSkeleton
  loading={loading}
  config={{
    tableCellBarHeightRatio: 0.5,   // bar is 50% of cell height
    tableCellInsetX: 12,             // 12px horizontal padding
    tableCellDefaultWidthRatio: 0.8, // 80% width fallback
  }}
>
  <table>...</table>
</AutoSkeleton>
```

### Theming with CSS Variables

Override the default colors globally without using the config prop:

```css
/* globals.css */
:root {
  --skeleton-base: #e2e8f0;
  --skeleton-highlight: #f8fafc;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --skeleton-base: #1e293b;
    --skeleton-highlight: #334155;
  }
}
```

Or pass colors directly via config:

```tsx
<AutoSkeleton
  loading={loading}
  config={{
    baseColor: "#1e293b",
    highlightColor: "#334155",
    animation: "pulse",
    speed: 1.5,
  }}
>
  {children}
</AutoSkeleton>
```

---

## Accessibility

`@ghostframe/ghostframe` is built with accessibility in mind:

- The container root receives `aria-busy={loading}` — screen readers announce loading state changes
- The skeleton overlay sets `aria-hidden="true"` — it is invisible to assistive technology
- All animations respect `prefers-reduced-motion: reduce` — if the user prefers reduced motion, all animations are disabled and opacity is set to a static `0.7`
- Elements marked `data-no-skeleton` remain pointer-event-active and visible while the skeleton is shown

---

## TypeScript

All props, config options, and return types are fully typed. Key types:

```ts
import type {
  AutoSkeletonProps,
  SkeletonRendererProps,
  SkeletonPhase,        // "idle" | "measuring" | "showing" | "exiting"
  SkeletonConfig,
  Blueprint,
  BlueprintNode,
  SkeletonRole,         // "text" | "image" | "avatar" | "icon" | ...
  AnimationMode,        // "shimmer" | "pulse" | "none"
  TextMeta,
  LayoutProps,
} from "@ghostframe/ghostframe";
```

---

## Versioning and Changelog

This package uses [Changesets](https://github.com/changesets/changesets) for releases.

```bash
# Add a changeset describing your change
pnpm changeset

# Apply changesets and bump versions
pnpm changeset version

# Publish to npm
pnpm changeset publish
```

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

---

## License

[MIT](../../LICENSE) © Ghostframe Contributors

