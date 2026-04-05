# @ghostframe/ghostframe Runtime APIs

> Framework-agnostic analysis engine, blueprint system, animation utilities, and shared types powering Ghostframe.

[![npm version](https://img.shields.io/npm/v/@ghostframe/ghostframe)](https://www.npmjs.com/package/@ghostframe/ghostframe)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@ghostframe/ghostframe)](https://bundlephobia.com/package/@ghostframe/ghostframe)
[![license](https://img.shields.io/npm/l/@ghostframe/ghostframe)](../../LICENSE)

The `@ghostframe/ghostframe/runtime` subpath is the framework-agnostic engine. It contains no React, Vue, or any UI-framework code. If you are building a React app, you almost certainly want [`@ghostframe/ghostframe`](../react/README.md), which includes the React facade.

Use `@ghostframe/ghostframe/runtime` directly when you are:

- Building your **own framework adapter** (Vue, Svelte, Solid, etc.)
- Generating blueprints **server-side** (Node.js / SSR — no DOM required)
- Accessing low-level utilities such as the blueprint cache, structural hashing, or the animation system

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

> **Note:** This package ships both CJS (`dist/index.js`) and ESM (`dist/index.mjs`) builds with full TypeScript declarations. It has **zero runtime dependencies**.

---

## What is a Blueprint?

A **Blueprint** is a serializable tree of `BlueprintNode`s that describes *what* skeleton elements to render and *where* — without any DOM or framework code involved. Both the static and dynamic analyzers produce Blueprints.

```ts
type Blueprint = {
  version: number;         // Schema version — bump on breaking changes
  rootWidth: number;       // Width of the measured root element (px)
  rootHeight: number;      // Height of the measured root element (px)
  nodes: BlueprintNode[];  // Top-level children of the root
  structuralHash?: string; // djb2 hash of the DOM structure (for cache invalidation)
  generatedAt: number;     // Date.now() timestamp
  source: "static" | "dynamic";
};
```

Each `BlueprintNode` describes one skeleton block:

```ts
type BlueprintNode = {
  id: string;
  role: SkeletonRole | "container" | "table-row" | "table-cell";
  width: number;           // px
  height: number;          // px
  top: number;             // px, relative to the skeleton root
  left: number;            // px, relative to the skeleton root
  layout: Partial<LayoutProps>;
  text?: TextMeta;         // defined when role === "text" or "table-cell"
  borderRadius: string;    // CSS value (e.g. "4px", "50%")
  aspectRatio?: string;    // CSS aspect-ratio (e.g. "16/9")
  tagName: string;         // Uppercase HTML tag name
  slotKey?: string;        // Populated when role === "custom"
  children: BlueprintNode[];
  // Table flags
  isTable?: boolean;
  isTableRow?: boolean;
  isTableCell?: boolean;
};
```

---

## Exports at a Glance

```ts
import {
  // Static analysis (SSR-safe, no DOM)
  generateStaticBlueprint,
  STATIC_DEFAULTS,
  type VNode,

  // Dynamic analysis (browser only)
  generateDynamicBlueprint,

  // Role inference
  inferRole,

  // Blueprint caching
  blueprintCache,
  computeStructuralHash,
  djb2,

  // Animation system
  animationSystem,
  AnimationSystem,

  // Types
  type Blueprint,
  type BlueprintNode,
  type SkeletonRole,
  type AnimationMode,
  type AnimationPreset,
  type SkeletonAnimationDefinition,
  type SkeletonConfig,
  type GhostframePropsBase,
  type LayoutProps,
  type TextMeta,
  type MeasuredNode,
  type RelevantComputedStyles,

  // Constants
  DEFAULT_CONFIG,
} from "@ghostframe/ghostframe/runtime";
```

---

## Static Analyzer — `generateStaticBlueprint`

**Signature:**
```ts
function generateStaticBlueprint(rootVNode: VNode): Blueprint
```

Traverses a virtual DOM tree (a React element tree, or any duck-typed `{ type, props }` object) and produces a `Blueprint` without touching the DOM. This makes it **safe to run in Node.js, during SSR, or inside Server Components**.

### How it works

1. Recursively walks `VNode` nodes.
2. Skips elements with `data-no-skeleton` or `data-skeleton-ignore` props.
3. Unrolls fragments and non-HTML components (anything whose `type` is not a string) by visiting their `children`.
4. Infers a `SkeletonRole` from the HTML tag name (e.g. `img → image`, `button → button`, `p → text`).
5. Respects `data-skeleton-role` and `data-skeleton-slot` props as explicit overrides.
6. Reads dimensions from (in priority order): `data-skeleton-w`/`data-skeleton-h` → `style.width`/`style.height` → `props.width`/`props.height` → `STATIC_DEFAULTS`.
7. Extracts layout props (`display`, `flexDirection`, `gap`, `padding`, etc.) from `style` for container nodes.

### Usage

```ts
import { generateStaticBlueprint } from "@ghostframe/ghostframe/runtime";

// Works in Node.js — no DOM, no browser APIs
const blueprint = generateStaticBlueprint({
  type: "div",
  props: {
    style: { display: "flex", gap: "12px" },
    children: [
      {
        type: "img",
        props: { style: { width: 48, height: 48, borderRadius: "50%" } },
      },
      {
        type: "div",
        props: {
          children: [
            { type: "h2", props: { children: "Name" } },
            { type: "p",  props: { children: "Bio text here" } },
          ],
        },
      },
    ],
  },
});
```

When using with React JSX, the JSX element IS a valid `VNode`, so you can pass JSX directly:

```tsx
// Works in a React Server Component or any tsx file
import { generateStaticBlueprint } from "@ghostframe/ghostframe/runtime";

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

### Return value

Returns a `Blueprint` with `source: "static"` and `rootWidth: 0` / `rootHeight: 0` (static mode uses flow layout; absolute positions are not computed).

### `STATIC_DEFAULTS`

The fallback dimensions used when no explicit size is provided:

| Role     | Default Width | Default Height |
|----------|--------------|----------------|
| `text`   | 200px        | 16px           |
| `image`  | 300px        | 200px          |
| `avatar` | 40px         | 40px           |
| `icon`   | 24px         | 24px           |
| `button` | 120px        | 36px           |
| `input`  | 240px        | 40px           |
| `video`  | 400px        | 225px          |
| `canvas` | 300px        | 150px          |
| `badge`  | 60px         | 22px           |

Override defaults per-element using `data-skeleton-w` / `data-skeleton-h`:

```tsx
<img data-skeleton-w={96} data-skeleton-h={96} />
```

### `VNode` type

```ts
type VNode = {
  type: unknown;                    // string for HTML tags, function/object for components
  props?: Record<string, unknown>;  // standard props including children
};
```

---

## Dynamic Analyzer — `generateDynamicBlueprint`

**Signature:**
```ts
async function generateDynamicBlueprint(
  root: HTMLElement,
  config?: SkeletonConfig,      // defaults to DEFAULT_CONFIG
  options?: {
    include?: ElementMatcher[];
    exclude?: ElementMatcher[];
    budgetMs?: number;
  }
): Promise<Blueprint>
```

Measures a **live DOM subtree** and produces a pixel-precise Blueprint using absolute positions. This is the engine behind `AutoSkeleton` in `@ghostframe/ghostframe`.

> **Browser only.** Requires `window`, `document`, `getComputedStyle`, and `getBoundingClientRect`.

### Include/Exclude controls

Both analyzers accept optional `include` and `exclude` matcher arrays. `exclude` always wins over `include`.

```ts
import { generateDynamicBlueprint } from "@skelcore/core";

const blueprint = await generateDynamicBlueprint(root, undefined, {
  include: [{ selector: ".skeleton-target" }],
  exclude: [{ selector: ".skeleton-ignore" }],
});
```

DOM attributes are also supported:

- `data-skeleton-include`
- `data-skeleton-exclude`

`data-skeleton-exclude` has highest precedence.

`budgetMs` is optional and enables a partial-traversal fallback: when the analyzer exceeds the configured budget, it returns the nodes computed so far instead of throwing.

### Three-pass architecture

The function is carefully designed to avoid [layout thrashing](https://www.afasterweb.com/2015/08/19/what-is-layout-thrashing/):

| Pass | What happens | DOM access |
|------|-------------|------------|
| **1 — Collect** | Walk the DOM tree, gather element references and depth | Read-only structural walk |
| **2 — Read** | Batch-read all `getBoundingClientRect()` + `getComputedStyle()` calls in one loop | Read-only, no writes |
| **3 — Process** | Pure JS: infer roles, clip to overflow containers, build tree | Zero DOM access |

### What gets skipped

- Elements with `data-skeleton-ignore` or `data-no-skeleton` attributes
- `display: none` (inline style fast-path, then computed style)
- `visibility: hidden` or `opacity < 0.01`
- Elements with `position: fixed`
- Elements with width or height `< 1px`
- Closed `<details>` elements
- Shadow DOM boundaries (`shadowRoot` stops traversal)
- Nodes deeper than `config.maxDepth` (default: 12)

### Special handling

- **Overflow clipping:** Nodes inside `overflow: hidden` parents are clamped to the parent's bounds.
- **CSS transforms:** Elements with an active `transform` fall back to `offsetTop`/`offsetLeft` (layout-based) rather than `getBoundingClientRect` for position, avoiding transform-offset confusion.
- **Text metrics:** For `text` role nodes, computes the number of lines (`ceil(height / lineHeight)`) and line height.
- **Table cells:** `<td>` and `<th>` get `table-cell` role with their own bar sizing based on `tableCellBarHeightRatio`.
- **Virtualized lists:** Logs a `console.warn` if a potential virtualized list is detected (very tall `scrollHeight` vs. few children).
- **Font loading:** Awaits `document.fonts.ready` before measuring, ensuring text layout is correct when web fonts are used.

### Usage

```ts
import { generateDynamicBlueprint, DEFAULT_CONFIG } from "@ghostframe/ghostframe/runtime";

const root = document.getElementById("my-card")!;
const blueprint = await generateDynamicBlueprint(root, {
  ...DEFAULT_CONFIG,
  maxDepth: 8,
  animation: "pulse",
});

console.log(blueprint.rootWidth, blueprint.rootHeight);
console.log(blueprint.nodes); // tree of BlueprintNodes
```

### Return value

Returns a `Blueprint` with `source: "dynamic"`, accurate `rootWidth`/`rootHeight`, and a `structuralHash` for cache invalidation.

---

## Role Inferencer — `inferRole`

**Signature:**
```ts
function inferRole(node: MeasuredNode, config: SkeletonConfig): SkeletonRole
```

Determines the `SkeletonRole` for a single element using a **weighted scoring system**. Called internally by `generateDynamicBlueprint` — you can use it directly if you are building a custom analyzer.

### Priority order

1. **Attribute overrides (exempt from scoring):**
   - `data-skeleton-ignore` → `"skip"`
   - `data-skeleton-role="<role>"` → explicit role (validated against known roles)
   - `data-skeleton-slot` → `"custom"`

2. **Visibility checks:**
   - `display: none`, `visibility: hidden`, `width/height === 0` → `"skip"`

3. **Scoring rules** — all matching rules accumulate points per role; the role with the highest score above threshold 30 wins.

### Scoring rules overview

| Role | Triggers |
|------|---------|
| `image` | `<img>`, `<picture>`, elements with `background-image`, large empty elements |
| `avatar` | Circular `<img>` (+150pts), circular square element 24–128px (+100pts) |
| `icon` | `<svg>` ≤ `iconMaxSize` (+100pts), small square `<svg>` (+60pts), small square non-svg (+40pts) |
| `video` | `<video>` (+100pts) |
| `canvas` | `<canvas>` (+100pts) |
| `button` | `<button>` (+100pts), `role="button"` (+80pts), short `<a>` (+60pts) |
| `input` | `<input>`, `<textarea>`, `<select>` (+100pts), `role="textbox"/"combobox"` (+80pts) |
| `badge` | Small pill with short text (height ≤ 28, width ≤ 120, borderRadius ≥ 20%) (+80pts) |
| `text` | Text tags (`<p>`, `<h1>`–`<h6>`, `<span>`, etc.) (+80pts), non-empty leaf nodes (+40pts) |

### `MeasuredNode` input structure

```ts
type MeasuredNode = {
  tagName: string;                          // Uppercase, e.g. "IMG", "BUTTON"
  ariaRole: string | null;                   // aria role attribute
  classList: string[];
  dataAttributes: Record<string, string>;    // All data-* attributes
  computedStyles: RelevantComputedStyles;
  rect: { width: number; height: number; top: number; left: number };
  hasChildren: boolean;
  childCount: number;
  textContent: string;                       // Trimmed inner text
  naturalWidth: number;                      // From HTMLImageElement.naturalWidth
  naturalHeight: number;
  src: string;                               // currentSrc, src, or href
};
```

### Usage

```ts
import { inferRole, DEFAULT_CONFIG } from "@ghostframe/ghostframe/runtime";

const role = inferRole(measuredNode, DEFAULT_CONFIG);
```

---

## Blueprint Cache

### `blueprintCache` (singleton)

A pre-created instance of `BlueprintCache`. Use this in your adapter to avoid re-measuring when the DOM structure hasn't changed.

```ts
import { blueprintCache, computeStructuralHash } from "@ghostframe/ghostframe/runtime";

const root = document.getElementById("my-widget")!;
const hash = computeStructuralHash(root, 12);

// Attempt cache hit
const cached = blueprintCache.get(root, hash);
if (cached) {
  // Structure hasn't changed — use cached blueprint
  return cached;
}

// Cache miss — measure and store
const fresh = await generateDynamicBlueprint(root);
blueprintCache.set(root, fresh, hash);
```

### `BlueprintCache` class

All methods operate on `Element` keys stored in a `WeakMap`, so blueprints are automatically garbage-collected when the element is removed from the DOM.

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(el: Element, hash: string) => Blueprint \| null` | Returns the cached blueprint if the structural hash matches; otherwise deletes the stale entry and returns `null`. |
| `set` | `(el: Element, blueprint: Blueprint, hash: string) => void` | Stores a blueprint with its structural hash. |
| `invalidate` | `(el: Element) => void` | Forcefully clears the cached blueprint for an element. |

### `computeStructuralHash`

**Signature:**
```ts
function computeStructuralHash(root: Element, maxDepth?: number): string
```

Generates a djb2 hash of the DOM subtree structure. The hash encodes `tagName`, `childElementCount`, `depth`, `data-skeleton-role`, and `data-skeleton-slot` for each node — but ignores text content and other attributes. This means:

- Adding or removing elements **invalidates** the cache ✅
- Changing text content or non-skeleton attributes does **not** invalidate the cache (by design)

```ts
import { computeStructuralHash } from "@ghostframe/ghostframe/runtime";

const hash = computeStructuralHash(root);       // default maxDepth: 12
const hash2 = computeStructuralHash(root, 6);   // shallower, cheaper
```

### `djb2`

**Signature:**
```ts
function djb2(str: string): string
```

The underlying fast non-cryptographic hash used by `computeStructuralHash`. Returns a hex string.

```ts
import { djb2 } from "@ghostframe/ghostframe/runtime";

djb2("hello world"); // "4a17b156"
```

---

## Animation System

### `animationSystem` (singleton)

A pre-created instance of `AnimationSystem`. Used by framework adapters to inject and manage the required CSS into `<head>`.

```ts
import { animationSystem, DEFAULT_CONFIG } from "@ghostframe/ghostframe/runtime";

// Inject CSS (idempotent — safe to call on every render)
animationSystem.injectStyles(DEFAULT_CONFIG);

// Clean up (e.g. on unmount of the last skeleton instance)
animationSystem.removeStyles();
```

### `AnimationSystem` class

| Method | Signature | Description |
|--------|-----------|-------------|
| `injectStyles` | `(config?: SkeletonConfig) => void` | Injects a `<style id="ghostframe-animations">` tag into `<head>`. Idempotent — only updates if the config changes. No-ops in non-browser environments. |
| `removeStyles` | `() => void` | Removes the managed style tag from `<head>`. |

### Injected CSS

`injectStyles` generates and injects:

**CSS Custom Properties (on `:root`):**

| CSS Variable | Config property | Default |
|--------------|----------------|---------|
| `--skel-base` | `config.baseColor` | `var(--skeleton-base, #e0e0e0)` |
| `--skel-highlight` | `config.highlightColor` | `var(--skeleton-highlight, #f5f5f5)` |
| `--skel-radius` | `config.borderRadius` | `4px` |

**CSS Classes:**

| Class | Role |
|-------|------|
| `.skel-block` | Base block style (`display: block`, `background-color: var(--skel-base)`, `border-radius: var(--skel-radius)`) |
| `.skel-shimmer` | Applied to animated blocks. In `shimmer` mode: gradient + animation. In `pulse`/`none`: static background. |
| `.skel-pulse` | Applied for pulse mode animation. |

**Keyframes:**

| Mode | Keyframe | Duration formula |
|------|----------|-----------------|
| `shimmer` | `skel-shimmer` (background-position 0→200%) | `2 / speed` seconds |
| `pulse` | `skel-pulse` (opacity 1→0.5→1) | `1.5 / speed` seconds |
| `none` | No keyframes emitted | — |

**Reduced Motion:**

```css
@media (prefers-reduced-motion: reduce) {
  .skel-shimmer, .skel-pulse {
    animation: none !important;
    opacity: 0.7 !important;
  }
}
```

**Opt-out visibility reset:**

```css
.skel-content[data-loading="true"] [data-no-skeleton],
.skel-content[data-loading="true"] [data-skeleton-ignore] {
  position: relative;
  z-index: 11;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
```

---

## Configuration — `SkeletonConfig`

All visual and behavioral options are controlled through a single `SkeletonConfig` object. The full default is exported as `DEFAULT_CONFIG`.

### Full Config Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animation` | `"shimmer" \| "pulse" \| "none"` | `"shimmer"` | Animation style applied to skeleton blocks. |
| `baseColor` | `string` | `"var(--skeleton-base, #e0e0e0)"` | CSS color for the skeleton block background. Supports CSS variables. |
| `highlightColor` | `string` | `"var(--skeleton-highlight, #f5f5f5)"` | Shimmer highlight color. Used only when `animation` is `"shimmer"`. |
| `borderRadius` | `number` | `4` | Pixel border radius for all non-avatar skeleton blocks. |
| `speed` | `number` | `1` | Animation speed multiplier. `2` = twice as fast. Minimum `0.1` (clamped). |
| `minTextHeight` | `number` | `12` | Minimum height in px for each text line bar. |
| `maxDepth` | `number` | `12` | Maximum DOM traversal depth. Increase for deeply nested UIs. |
| `lastLineRatio` | `number` | `0.7` | Width ratio (0–1) for the last line in multi-line text blocks. |
| `iconMaxSize` | `number` | `32` | `<svg>` elements ≤ this size (px) are classified as `icon`. |
| `minImageArea` | `number` | `900` | Minimum area in px² for a non-`<img>` element to be classified as `image`. |
| `transitionDuration` | `number` | `300` | Duration in ms of skeleton fade-out when loading ends. |
| `tableCellInsetX` | `number` | `8` | Horizontal padding in px for skeleton bars inside table cells. |
| `tableCellBarHeightRatio` | `number` | `0.45` | Height of the table-cell bar as a ratio of the cell height. |
| `tableCellBarMinHeight` | `number` | `6` | Minimum height in px for table-cell skeleton bars. |
| `tableCellDefaultWidthRatio` | `number` | `0.7` | Fallback width ratio (0–1) for table-cell bars when text width cannot be inferred. |

### `DEFAULT_CONFIG`

```ts
import { DEFAULT_CONFIG } from "@ghostframe/ghostframe/runtime";

// DEFAULT_CONFIG:
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

---

## Type Reference

All types are exported from the package entry point.

### `SkeletonRole`

```ts
type SkeletonRole =
  | "text"    // <p>, heading, inline text
  | "image"   // <img>, background-image, <picture>
  | "avatar"  // Circular image (border-radius >= 50%)
  | "icon"    // <svg>, small square
  | "button"  // <button>, role="button"
  | "input"   // <input>, <textarea>, <select>
  | "video"   // <video>
  | "canvas"  // <canvas>
  | "badge"   // Small pill text (tag, chip)
  | "custom"  // User-provided slot via data-skeleton-slot
  | "skip";   // Too small or explicitly excluded
```

### `AnimationMode`

```ts
type AnimationMode = "pulse" | "shimmer" | "none";
```

### `TextMeta`

Populated on `BlueprintNode` when `role === "text"` or `role === "table-cell"`.

```ts
type TextMeta = {
  lines: number;             // Estimated number of text lines
  lineHeight: number;        // px — computed from CSS lineHeight
  lastLineWidthRatio: number; // 0–1, how wide the last line is (default 0.7)
};
```

### `LayoutProps`

Collected from containers for flow-mode rendering:

```ts
type LayoutProps = {
  display: string;
  flexDirection: string;
  flexWrap: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
  rowGap: string;
  columnGap: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  padding: string;
  margin: string;
  // Flex child props
  flex: string;
  flexGrow: string;
  flexShrink: string;
  flexBasis: string;
  alignSelf: string;
  // Grid child props
  gridColumn: string;
  gridRow: string;
  direction: string;
};
```

### `GhostframePropsBase`

The base props type for framework adapters (e.g. `@ghostframe/ghostframe` extends this):

```ts
type GhostframePropsBase = {
  loading: boolean;
  config?: Partial<SkeletonConfig>;
  blueprint?: Blueprint;          // SSR pre-computed blueprint
  remeasureOnResize?: boolean;
};
```

---

## Data Attributes

Control skeleton behavior from markup — no code changes required.

| Attribute | Scope | Effect |
|-----------|-------|--------|
| `data-skeleton-ignore` | Any element | Exclude this element **and all its descendants** from measurement. |
| `data-no-skeleton` | Any element | Keep element visible and interactive while the skeleton overlay is active. Uses z-index and visibility overrides. |
| `data-skeleton-role="<role>"` | Any element | Force a specific `SkeletonRole`. Validated — invalid values fall through to scoring. |
| `data-skeleton-slot="<key>"` | Any element | Mark as a custom slot. Only meaningful to framework adapters that accept `slots` maps. |
| `data-skeleton-w="<number>"` | Static blueprints | Override the width (px) used in static blueprint generation. |
| `data-skeleton-h="<number>"` | Static blueprints | Override the height (px) used in static blueprint generation. |

### Static blueprint data attribute example

```tsx
// Forces avatar dimensions to 64x64 in static blueprints
<img
  src={user.avatar}
  data-skeleton-role="avatar"
  data-skeleton-w={64}
  data-skeleton-h={64}
/>
```

### Dynamic exclusion example

```html
<!-- Measured, but always visible on top of the skeleton overlay -->
<nav data-no-skeleton>...</nav>

<!-- Completely excluded from skeleton measurement -->
<aside data-skeleton-ignore>...</aside>
```

---

## Skeleton Roles

| Role | Visual | Inferred when... |
|------|--------|--------------------|
| `text` | Multi-line horizontal bars | `<p>`, `<h1>`–`<h6>`, `<span>`, `<li>`, `<a>`, or any leaf with text |
| `image` | Solid rectangle | `<img>`, `<picture>`, elements with `background-image`, or large empty non-child elements |
| `avatar` | Circular block | `<img>` or element with `border-radius >= 50%` and width 24–128px |
| `icon` | Small square | `<svg>` smaller than `iconMaxSize`, or small square elements (8–32px) |
| `button` | Pill-shaped bar | `<button>`, `role="button"`, or compact `<a>` |
| `input` | Rounded rectangle | `<input>`, `<textarea>`, `<select>`, or `role="textbox"/"combobox"` |
| `video` | Aspect-ratio rectangle | `<video>` |
| `canvas` | Rectangle | `<canvas>` |
| `badge` | Small pill | Small element with short text, high border-radius (≥ 20%), height ≤ 28px, width ≤ 120px |
| `custom` | Calls slot renderer | Element with `data-skeleton-slot` attribute |
| `skip` | Nothing rendered | Invisible, zero-size, or explicitly `data-skeleton-ignore` elements |

---

## Versioning and Changelog

This package uses [Changesets](https://github.com/changesets/changesets) for automated versioning and changelog generation.

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

