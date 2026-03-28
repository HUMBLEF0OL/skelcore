# SkelCore v2 — Agent Build Plan

> **Purpose**: This document is the complete ground-up specification for rebuilding
> `skelcore`. Every phase is self-contained and executable by an agent in
> sequence. No phase assumes knowledge beyond what is defined here and in prior phases.

---

## Guiding Principles

1. **Measure once, cache forever** — blueprint re-computation only when structure changes.
2. **Zero layout thrashing** — all DOM reads are batched before any processing begins.
3. **SSR-first, enhance on client** — a static mode generates skeletons from the React
   element tree (no DOM required). The dynamic client mode replaces it after hydration.
4. **CSS does the animation work** — shimmer and pulse are GPU-composited via a single
   shared keyframe; no per-element JS timers.
5. **Framework-agnostic core** — pure TS logic lives in `@autoskeleton/core`. The React
   adapter is a thin binding. Vue/Svelte adapters become trivially addable later.
6. **Tree-shakeable by default** — every export is individually importable.

---

## Repository Layout

```
autoskeleton/
├── packages/
│   ├── core/           # Pure TS: types, blueprint engine, role inferencer, cache
│   ├── react/          # React adapter: components, hooks, RSC boundary
│   └── test-utils/     # Shared test helpers (mock DOM, fixture trees)
├── apps/
│   └── demo/           # Next.js 15 App Router demo (proves SSR path works)
├── scripts/            # Release, size-check, benchmark scripts
├── .changeset/
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

Use **pnpm workspaces** + **Turborepo** for the monorepo.  
Build tool: **tsup** (zero-config, ESM + CJS dual output).  
Test runner: **Vitest** for unit tests; **Playwright** for integration tests.

---

## Phase 0 — Repository Bootstrap

**Goal**: Working monorepo with CI, linting, build pipeline before a single feature line.

### Tasks

1. Init pnpm workspace. Node ≥ 20 required (for `structuredClone`, `WeakRef`).
2. Configure Turborepo with `build`, `test`, `lint`, `typecheck` pipelines.
3. Add ESLint (flat config), Prettier, TypeScript 5.x strict mode across all packages.
4. Add `size-limit` to enforce: `@autoskeleton/core` ≤ 6 KB gzip, `@autoskeleton/react`
   ≤ 10 KB gzip total.
5. GitHub Actions CI: run `turbo test lint typecheck build` on every PR.
6. Configure **Changesets** for versioned releases.
7. Set `"type": "module"` in all `package.json`s. Dual CJS/ESM output via tsup.


---

## Phase 1 — Core Types & Contracts

**Package**: `packages/core/src/types.ts`  
**Goal**: Define every data shape used across the entire system. Nothing is built until
types are finalised and reviewed.

### 1.1 Element Roles

```ts
export type SkeletonRole =
  | 'text'        // Paragraph, heading, inline text
  | 'image'       // <img>, background-image, <picture>
  | 'avatar'      // Circular image (border-radius >= 50%)
  | 'icon'        // <svg>, small square
  | 'button'      // <button>, role="button"
  | 'input'       // <input>, <textarea>, <select>
  | 'video'       // <video>
  | 'canvas'      // <canvas>
  | 'badge'       // Small pill text (e.g. tag, chip)
  | 'custom'      // User-provided slot via data-skeleton-slot
  | 'skip';       // Too small, excluded from skeleton
```

### 1.2 Blueprint Node

A `BlueprintNode` is the serialisable, DOM-free representation of one skeleton element.
It must be JSON-serialisable so it can be generated on the server and sent to the client.

```ts
export type LayoutProps = {
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
};

export type TextMeta = {
  lines: number;
  lineHeight: number;     // px
  lastLineWidthRatio: number; // 0–1, default 0.7
};

export type BlueprintNode = {
  id: string;
  role: SkeletonRole | 'container' | 'table-row' | 'table-cell';
  width: number;          // px
  height: number;         // px
  top: number;            // px, relative to skeleton root
  left: number;           // px, relative to skeleton root
  layout: Partial<LayoutProps>;
  text?: TextMeta;
  borderRadius: string;   // CSS value
  aspectRatio?: string;   // for images/video
  tagName: string;
  slotKey?: string;       // populated when role === 'custom'
  children: BlueprintNode[];
  // Table support
  isTable?: boolean;
  isTableRow?: boolean;
  isTableCell?: boolean;
};

export type Blueprint = {
  version: number;          // bump on breaking schema change
  rootWidth: number;
  rootHeight: number;
  nodes: BlueprintNode[];
  generatedAt: number;      // Date.now()
  source: 'static' | 'dynamic'; // how it was generated
};
```

### 1.3 Configuration

```ts
export type AnimationMode = 'pulse' | 'shimmer' | 'none';

export type SkeletonConfig = {
  animation: AnimationMode;
  baseColor: string;          // CSS color, default var(--skeleton-base)
  highlightColor: string;     // shimmer highlight, default var(--skeleton-highlight)
  borderRadius: number;       // px, default 4
  speed: number;              // animation duration multiplier, default 1
  minTextHeight: number;      // px, default 12
  maxDepth: number;           // DOM traversal limit, default 12
  lastLineRatio: number;      // last text line width, default 0.7
  iconMaxSize: number;        // px, below which SVG = icon, default 32
  minImageArea: number;       // px², below which not classified as image, default 900
  transitionDuration: number; // ms, content fade-in, default 300
};

export const DEFAULT_CONFIG: SkeletonConfig = {
  animation: 'shimmer',
  baseColor: 'var(--skeleton-base, #e0e0e0)',
  highlightColor: 'var(--skeleton-highlight, #f5f5f5)',
  borderRadius: 4,
  speed: 1,
  minTextHeight: 12,
  maxDepth: 12,
  lastLineRatio: 0.7,
  iconMaxSize: 32,
  minImageArea: 900,
  transitionDuration: 300,
};
```

### 1.4 Public Component Props

```ts
// For @autoskeleton/react
export type AutoSkeletonProps = {
  loading: boolean;
  children: React.ReactNode;
  config?: Partial<SkeletonConfig>;
  // SSR static fallback — rendered server-side, swapped on hydration
  fallback?: React.ReactNode;
  // Slots: override skeleton rendering for specific data-skeleton-slot keys
  slots?: Record<string, () => React.ReactNode>;
  // Callbacks
  onMeasured?: (blueprint: Blueprint) => void;
  onTransitionEnd?: () => void;
  // A pre-computed blueprint from SSR — skip measurement if provided
  blueprint?: Blueprint;
  // Opt-in to re-measure when container resizes
  remeasureOnResize?: boolean;
};
```

---

## Phase 2 — Role Inferencer

**Package**: `packages/core/src/role-inferencer.ts`  
**Goal**: Classify a single element given its measurements and styles. Pure function, zero
side-effects, fully testable.

### Architecture

The inferencer works on a `MeasuredNode` (an intermediate type that bridges raw DOM data
and the blueprint):

```ts
type MeasuredNode = {
  tagName: string;
  role: string | null;       // aria role attribute
  classList: string[];
  dataAttributes: Record<string, string>;
  computedStyles: Pick<CSSStyleDeclaration, RelevantStyleKeys>;
  rect: DOMRect;
  hasChildren: boolean;
  childCount: number;
  textContent: string | null;
  naturalWidth?: number;     // for <img>
  naturalHeight?: number;
  src?: string;
};
```

### Scoring System

Each candidate role gets a score. Return the role with the highest score above the
minimum threshold (30). Scoring must be a **pure data table** — no if/else chains.

```ts
type ScoringRule = {
  condition: (node: MeasuredNode, config: SkeletonConfig) => boolean;
  role: SkeletonRole | 'skip';
  points: number;
};

const SCORING_RULES: ScoringRule[] = [
  // --- SKIP ---
  { role: 'skip', points: 60, condition: (n) => n.rect.width * n.rect.height < 100 },
  { role: 'skip', points: 50, condition: (n) => n.rect.height < 4 || n.rect.width < 4 },
  { role: 'skip', points: 40, condition: (n) =>
      n.computedStyles.display === 'none' ||
      n.computedStyles.visibility === 'hidden' ||
      n.computedStyles.opacity === '0'
  },
  // --- IMAGE ---
  { role: 'image', points: 100, condition: (n) => n.tagName === 'IMG' },
  { role: 'image', points: 70,  condition: (n) => n.tagName === 'PICTURE' },
  { role: 'image', points: 60,  condition: (n) => n.role === 'img' },
  { role: 'image', points: 50,  condition: (n) =>
      n.computedStyles.backgroundImage !== 'none' &&
      !n.computedStyles.backgroundImage.includes('gradient')
  },
  { role: 'image', points: 30,  condition: (n, c) =>
      n.rect.width * n.rect.height >= c.minImageArea
  },
  // --- AVATAR (must outscore image for circular images) ---
  { role: 'avatar', points: 80, condition: (n) =>
      n.tagName === 'IMG' &&
      parseFloat(n.computedStyles.borderRadius) >= n.rect.width / 2
  },
  { role: 'avatar', points: 60, condition: (n) =>
      n.computedStyles.borderRadius.includes('50%') &&
      Math.abs(n.rect.width - n.rect.height) < 8
  },
  // --- ICON ---
  { role: 'icon', points: 80, condition: (n) => n.tagName === 'SVG' },
  { role: 'icon', points: 40, condition: (n, c) =>
      n.rect.width <= c.iconMaxSize &&
      n.rect.height <= c.iconMaxSize &&
      Math.abs(n.rect.width - n.rect.height) / Math.max(n.rect.width, n.rect.height) < 0.25
  },
  // --- VIDEO ---
  { role: 'video', points: 100, condition: (n) => n.tagName === 'VIDEO' },
  // --- CANVAS ---
  { role: 'canvas', points: 100, condition: (n) => n.tagName === 'CANVAS' },
  // --- BUTTON ---
  { role: 'button', points: 90, condition: (n) => n.tagName === 'BUTTON' },
  { role: 'button', points: 70, condition: (n) => n.role === 'button' },
  { role: 'button', points: 30, condition: (n) =>
      n.computedStyles.cursor === 'pointer' &&
      n.rect.width * n.rect.height < 20_000
  },
  // --- BADGE (must outscore button for small pill-shaped elements) ---
  { role: 'badge', points: 60, condition: (n) =>
      !!n.textContent?.trim() &&
      n.rect.height < 32 &&
      parseFloat(n.computedStyles.borderRadius) >= n.rect.height / 2
  },
  // --- INPUT ---
  { role: 'input', points: 90, condition: (n) =>
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName)
  },
  { role: 'input', points: 60, condition: (n) =>
      n.dataAttributes['contenteditable'] !== undefined
  },
  // --- TEXT ---
  { role: 'text', points: 40, condition: (n) => !!n.textContent?.trim() },
  { role: 'text', points: 30, condition: (n, c) =>
      n.rect.height >= c.minTextHeight &&
      n.rect.height <= c.minTextHeight * 4
  },
  { role: 'text', points: 20, condition: (n) =>
      ['P','SPAN','H1','H2','H3','H4','H5','H6','LABEL','A','LI','TD','TH'].includes(n.tagName)
  },
  { role: 'text', points: 15, condition: (n) => !n.hasChildren },
];
```

The inferencer aggregates scores per role and returns the winner. If all scores are below
30, defaults to `'text'`.

### Override handling

Before scoring, check:
1. `data-skeleton-ignore` → return `'skip'`
2. `data-skeleton-role="<role>"` → return that role immediately, no scoring
3. `data-skeleton-slot="<key>"` → return `'custom'`

### Tests required (Phase 2)

- `<img>` → `image`
- `<img style="border-radius:50%">` → `avatar`
- `<svg width="20" height="20">` → `icon`
- `<svg width="400" height="300">` → `image`
- `<button>` → `button`
- `<span style="border-radius:99px; height:20px">` → `badge`
- `<div style="display:none">` → `skip`
- `<div style="width:2px;height:2px">` → `skip`
- `data-skeleton-role="image"` on a `<span>` → `image`
- 40+ total test cases

---

## Phase 3 — Static Analyzer (SSR Path)

**Package**: `packages/core/src/static-analyzer.ts`  
**Goal**: Generate a `Blueprint` from a React element tree **without any DOM access**.
This runs on the server or in React Server Components.

### Design Decision: Why static analysis is worth it

Without a static analyzer, SSR apps must choose between:
- Showing a flash of unstyled content before hydration
- Writing manual skeleton components (the thing this library avoids)

With a static analyzer, you wrap your component in `<AutoSkeleton loading={true}>`
during SSR and get a reasonable skeleton HTML embedded in the initial response. The
client then upgrades to the measured blueprint silently.

### Approach

React element trees are inspectable via `React.Children` and element type introspection.
The static analyzer does a best-effort structural pass:

1. Walk the React element tree recursively
2. Classify elements by tag name and props alone (no computed styles available)
3. Apply **heuristic dimensions**: use `style.width/height`, `width/height` props,
   or fall back to **role-based defaults**
4. Produce a `Blueprint` with `source: 'static'`

### Role-based dimension defaults (fallbacks when no size is known)

```ts
const STATIC_DEFAULTS: Record<string, { width: number; height: number }> = {
  text:   { width: 200, height: 16 },
  image:  { width: 300, height: 200 },
  avatar: { width: 40,  height: 40  },
  icon:   { width: 24,  height: 24  },
  button: { width: 120, height: 36  },
  input:  { width: 240, height: 40  },
  video:  { width: 400, height: 225 },
  canvas: { width: 300, height: 150 },
  badge:  { width: 60,  height: 22  },
};
```

### Static Blueprint accuracy expectation

The static blueprint is **not pixel-perfect** — it is a structural skeleton that
shows the right number of lines, images, and inputs in the right layout. The client
dynamic blueprint replaces it on first hydration silently. Document this clearly.

### Opt-out for static analysis

Elements that use CSS classes for sizing (Tailwind, CSS Modules) will produce
inaccurate defaults. Provide `data-skeleton-w="200"` and `data-skeleton-h="48"`
data attributes that the static analyzer reads to override defaults.

```tsx
// User adds to their component:
<img src={src} data-skeleton-w="320" data-skeleton-h="180" />
```

### Tests required (Phase 3)

- Simple JSX tree → valid Blueprint with `source: 'static'`
- `<img width="200" height="100">` → correct dimensions
- Nested flex container → children listed under container node
- `data-no-skeleton` child → excluded from blueprint
- Blueprint is JSON-serialisable (no circular refs, no DOM objects)

---

## Phase 4 — Dynamic Analyzer (Client Path)

**Package**: `packages/core/src/dynamic-analyzer.ts`  
**Goal**: Generate a precise `Blueprint` from a live DOM subtree with zero layout thrashing.

### The Three-Pass Algorithm (critical for performance)

**NEVER interleave reads and writes. NEVER call `getBoundingClientRect` inside a loop
that also writes to the DOM.**

```
Pass 1 — COLLECT (pure DOM traversal, no measurements)
  Walk the DOM tree, build a flat list of { element, depth, path } objects.
  Apply opt-out rules: skip elements with data-no-skeleton, data-skeleton-ignore,
  display:none (checked only via getAttribute to avoid forced style recalc).
  Respect maxDepth.

Pass 2 — READ (all measurements in one contiguous block)
  Iterate the flat list.
  For every element: read getBoundingClientRect() → store in parallel array
  For every element: read getComputedStyle()     → store in parallel array
  NOTHING else happens in this loop.
  This causes exactly ONE layout reflow at the start of the loop.

Pass 3 — PROCESS (pure JS, zero DOM access)
  Combine element + rect + style data.
  Run role inferencer on each leaf.
  Build the BlueprintNode tree.
  Compute positions relative to the root element's rect (subtract root.top, root.left).
  Detect multi-line text blocks.
  Handle table structure (see §4.1).
  Return Blueprint.
```

### Timing: When to trigger measurement

```
1. await document.fonts.ready
2. await new Promise(resolve => requestAnimationFrame(resolve))
3. await new Promise(resolve => requestAnimationFrame(resolve))  // double rAF
4. Now run the three-pass algorithm
```

The double `rAF` guarantees the browser has both computed layout AND applied web fonts
before any measurement begins. This is the most reliable cross-browser timing.

### 4.1 Table Structure Preservation

Tables require special handling because replacing `<td>` content with a block skeleton
breaks the column-width algorithm.

Detection: if `tagName` is one of `TABLE | THEAD | TBODY | TFOOT | TR`, mark as
structural — never skeletonise the element itself, recurse into children.

For `TH | TD`: preserve the cell element, skeletonise only its *first text child*.

### 4.2 Multi-line Text Detection

```ts
function detectTextLines(rect: DOMRect, styles: CSSStyleDeclaration, config: SkeletonConfig): TextMeta {
  let lineHeight = parseFloat(styles.lineHeight);
  if (isNaN(lineHeight)) {
    // 'normal' → estimate as fontSize * 1.2
    lineHeight = parseFloat(styles.fontSize) * 1.2;
  }
  const lines = lineHeight > 0 ? Math.max(1, Math.ceil(rect.height / lineHeight)) : 1;
  return {
    lines,
    lineHeight,
    lastLineWidthRatio: lines > 1 ? config.lastLineRatio : 1,
  };
}
```

### 4.3 Transform-aware positioning

Elements with CSS `transform` return viewport-relative coords from
`getBoundingClientRect()` that include the transformation. Since the skeleton is
rendered in un-transformed space, we must detect this case.

```ts
// After reading rect for an element:
const transform = styles.transform;
if (transform && transform !== 'none') {
  // Store a flag on the node: transformApplied = true
  // During rendering, position the skeleton block in the
  // parent's coordinate space (use offsetTop/offsetLeft chain) rather than
  // the rAF-measured rect. This is less accurate but prevents visible drift.
}
```

Specifically: walk `offsetParent` chain to get untransformed position when
`transform !== 'none'`.

### 4.4 Edge Case Handling Matrix

| Situation | Detection | Handling |
|---|---|---|
| `display: none` | `styles.display === 'none'` | Skip node and all children |
| `visibility: hidden` | `styles.visibility === 'hidden'` | Skip node (children may still be visible) |
| `opacity: 0` | `styles.opacity === '0'` | Skip node |
| `position: fixed` | `styles.position === 'fixed'` | Skip — cannot position correctly |
| `position: sticky` | `styles.position === 'sticky'` | Treat as `position: relative` for measurement |
| Zero-size element | `rect.width < 1 || rect.height < 1` | Skip — assign `skip` role |
| Negative margin | Negative margin in styles | Clamp to 0 in blueprint |
| `overflow: hidden` container | Detected at container | Clip child rects to container bounds |
| CSS `transform` | `styles.transform !== 'none'` | Use offsetTop/offsetLeft chain |
| Inside `<details>` (closed) | `closest('details:not([open])')` | Skip subtree |
| Shadow DOM host | `element.shadowRoot !== null` | Skip (cannot pierce shadow boundary) |
| Web font not loaded | Should not happen (guarded by `fonts.ready`) | N/A |
| RTL layout | `styles.direction === 'rtl'` | Store on BlueprintNode; renderer mirrors bar widths |
| `<img>` not loaded | `img.naturalWidth === 0` | Use `width`/`height` attrs, then parent width |
| Virtualized list | Large gap between element count and container height | Emit warning; skip children beyond maxDepth |

### 4.5 Resize Invalidation

```ts
// Attached in the React adapter, not in core
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    blueprintCache.invalidate(entry.target);
  }
});
ro.observe(rootElement);
```

### Tests required (Phase 4)

- Batched read order verified (no interleaving) via mock that throws if write follows read
- `display: none` child excluded
- Multi-line text: height=48, lineHeight=16 → 3 lines
- Table structure: `<table><tr><td>text</td></tr></table>` → table-row + table-cell nodes
- Image with `naturalWidth=0` → falls back to attribute dimensions
- Transform-bearing element uses offsetParent chain
- Closed `<details>` children skipped
- Blueprint positions are root-relative (not viewport-relative)

---

## Phase 5 — Blueprint Cache

**Package**: `packages/core/src/blueprint-cache.ts`  
**Goal**: Avoid re-measuring when the DOM structure hasn't changed.

### Cache Design

```ts
type CacheEntry = {
  blueprint: Blueprint;
  structuralHash: string;
  timestamp: number;
};

class BlueprintCache {
  // WeakMap so entries are GC'd when the container element is removed
  private store = new WeakMap<Element, CacheEntry>();

  get(el: Element, currentHash: string): Blueprint | null {
    const entry = this.store.get(el);
    if (!entry) return null;
    if (entry.structuralHash !== currentHash) return null;
    return entry.blueprint;
  }

  set(el: Element, blueprint: Blueprint, hash: string): void {
    this.store.set(el, { blueprint, hash, timestamp: Date.now() });
  }

  invalidate(el: Element): void {
    this.store.delete(el);
  }
}

export const blueprintCache = new BlueprintCache();
```

### Structural Hash

A cheap hash of the DOM structure that changes when elements are added/removed but does
NOT change when only text content or class names change (those don't affect skeleton shape).

```ts
function computeStructuralHash(root: Element, maxDepth: number): string {
  // Serialise: tagName + childCount at each level, DFS order
  // Use a simple djb2 hash over this string — no crypto needed
  const parts: string[] = [];
  walkDOM(root, (el, depth) => {
    parts.push(`${el.tagName}:${el.childElementCount}:${depth}`);
  }, maxDepth);
  return djb2(parts.join('|'));
}
```

Cache hit rate in practice: very high. Most components re-load the same structure every
time (e.g. a product card always has 1 image + 2 text lines + 1 button).

---

## Phase 6 — Animation System

**Package**: `packages/react/src/styles.ts` (injected as a `<style>` tag once)  
**Goal**: GPU-composited shimmer and pulse animations. Zero JS per frame.

### Design

All skeleton blocks share a **single `background-position` animation** via a CSS custom
property. There is no per-element JS. The shimmer effect is achieved by a single
`@keyframes` that moves `background-position` across all skeleton blocks simultaneously.

```css
:root {
  --skeleton-base: #e0e0e0;
  --skeleton-highlight: #f5f5f5;
  --skeleton-speed: 1;
  --skeleton-radius: 4px;
}

/* Shimmer: single keyframe, shared by all blocks via background-size on root */
@keyframes skeleton-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

/* Pulse */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1;   }
  50%       { opacity: 0.5; }
}

.sk-block {
  display: block;
  border-radius: var(--skeleton-radius);
  background-color: var(--skeleton-base);
}

.sk-block[data-animation="shimmer"] {
  background: linear-gradient(
    90deg,
    var(--skeleton-base)      0%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base)      100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer calc(1.4s / var(--skeleton-speed)) linear infinite;
  will-change: background-position;
}

.sk-block[data-animation="pulse"] {
  animation: skeleton-pulse calc(1.4s / var(--skeleton-speed)) ease-in-out infinite;
  will-change: opacity;
}

/* Transition: content fades in, skeleton fades out simultaneously */
.sk-root {
  position: relative;
}

.sk-content {
  transition: opacity var(--skeleton-transition, 300ms) ease;
}
.sk-content[data-loading="true"] {
  opacity: 0;
  pointer-events: none;
  user-select: none;
}

.sk-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity var(--skeleton-transition, 300ms) ease;
}
.sk-overlay[data-exiting="true"] {
  opacity: 0;
}
```

### Why `data-animation` over class variants

Using a data attribute avoids specificity conflicts with user stylesheets. The single
`will-change: background-position` prop is enough for GPU promotion; no explicit
`transform: translateZ(0)` hack needed.

### Style injection

Inject the stylesheet exactly once via a module-level singleton:

```ts
let injected = false;
export function injectStyles(): void {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.autoskeleton = '1';
  style.textContent = SKELETON_CSS; // the above CSS as a template literal
  document.head.appendChild(style);
  injected = true;
}
```

For SSR, export `SKELETON_CSS` so the app can add it to `<head>` server-side.

---

## Phase 7 — Skeleton Renderer

**Package**: `packages/react/src/SkeletonRenderer.tsx`  
**Goal**: Convert a `Blueprint` into React elements. Pure render function, no hooks,
no side-effects.

### Renderer Rules

1. Only render nodes where `role !== 'skip'`
2. `container` nodes → render a `<div>` with layout styles copied exactly; recurse
3. `text` nodes with `lines > 1` → render multiple `<span>` bars with the last bar
   at `lastLineWidthRatio` width
4. `image` / `avatar` / `video` / `canvas` → single block preserving aspect ratio
5. `icon` → square block with tight border-radius
6. `button` / `badge` → block with border-radius matching original
7. `input` → block with border-radius 4
8. `custom` → call `slots[node.slotKey]()` if provided, else render as generic block
9. Table nodes → render actual `<table>/<tr>/<td>` structure

### Positioning Strategy

The skeleton overlay is `position: absolute; inset: 0`. Two approaches:

**Option A — Flow layout (preferred when blueprint source = 'static')**  
Render skeleton nodes as normal flow elements so they don't need explicit top/left coords.
This matches the static blueprint's structural nature.

**Option B — Absolute positioning (preferred when source = 'dynamic')**  
Each node gets `position: absolute; top: Xpx; left: Xpx; width: Xpx; height: Xpx`.
Pixel-perfect matching of the measured DOM.

The renderer accepts a `mode` prop (`'flow' | 'absolute'`) and the hook provides the
correct mode based on blueprint source.

### Multi-line text render

```tsx
function renderTextBlock(node: BlueprintNode, config: SkeletonConfig): React.ReactNode {
  const { lines, lineHeight, lastLineWidthRatio } = node.text!;
  return Array.from({ length: lines }, (_, i) => (
    <span
      key={i}
      className="sk-block"
      data-animation={config.animation}
      style={{
        display: 'block',
        width: i === lines - 1 ? `${lastLineWidthRatio * 100}%` : '100%',
        height: config.minTextHeight,
        marginBottom: i < lines - 1 ? lineHeight - config.minTextHeight : 0,
        borderRadius: config.borderRadius,
      }}
    />
  ));
}
```

---

## Phase 8 — React Adapter

**Package**: `packages/react/src/`

### 8.1 `useAutoSkeleton` hook

```ts
// packages/react/src/useAutoSkeleton.ts

export function useAutoSkeleton(
  loading: boolean,
  contentRef: React.RefObject<HTMLElement>,
  config: SkeletonConfig,
  options: {
    onMeasured?: (b: Blueprint) => void;
    remeasureOnResize?: boolean;
    externalBlueprint?: Blueprint;
  }
): {
  blueprint: Blueprint | null;
  phase: 'idle' | 'measuring' | 'showing' | 'exiting';
}
```

**State machine**:

```
idle
  └─ loading becomes true
       └─► measuring
             └─ measurement completes
                  └─► showing
                        └─ loading becomes false
                             └─► exiting  (skeleton fade-out, duration = transitionDuration)
                                   └─► idle (skeleton unmounted)
```

**Implementation notes**:
- Use `useEffect` to react to `loading` changes
- Check blueprint cache before triggering measurement
- Measurement is async (awaits `fonts.ready` + double rAF)
- `exiting` state is entered by setting `data-exiting="true"` on the overlay and
  waiting for `transitionDuration` ms via `setTimeout`
- ResizeObserver setup/teardown inside the hook when `remeasureOnResize` is true

### 8.2 `AutoSkeleton` component

```tsx
// packages/react/src/AutoSkeleton.tsx

export function AutoSkeleton({
  loading,
  children,
  config: configOverride,
  fallback,
  slots,
  onMeasured,
  onTransitionEnd,
  blueprint: externalBlueprint,
  remeasureOnResize = false,
}: AutoSkeletonProps) {
  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, contentRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
  });

  // Inject CSS once
  useEffect(() => { injectStyles(); }, []);

  const isLoading = phase === 'measuring' || phase === 'showing';
  const showSkeleton = phase === 'showing' || phase === 'exiting';

  return (
    <div className="sk-root">
      {/* Layer 1: Real content — always in DOM, hidden during loading */}
      <div
        ref={contentRef}
        className="sk-content"
        data-loading={isLoading ? 'true' : 'false'}
        onTransitionEnd={phase === 'idle' ? onTransitionEnd : undefined}
      >
        {children}
      </div>

      {/* Layer 2: Skeleton overlay — mounted only when needed */}
      {showSkeleton && blueprint && (
        <div
          className="sk-overlay"
          data-exiting={phase === 'exiting' ? 'true' : 'false'}
          aria-hidden="true"
        >
          <SkeletonRenderer
            blueprint={blueprint}
            config={config}
            slots={slots}
          />
        </div>
      )}

      {/* SSR fallback — shown before hydration, removed after */}
      {!loading && !blueprint && fallback}
    </div>
  );
}
```

**Key detail**: Only TWO layers of `children` are in the DOM (content + overlay).
The original library had THREE (content + measurement container + overlay). The
measurement is performed on the `contentRef` div directly — the real content is
already rendered there when `loading={true}` but hidden.

### 8.3 `data-no-skeleton` behaviour

Elements with `data-no-skeleton` must remain visible during skeleton phase. Achieved
via CSS:

```css
/* In the injected stylesheet */
.sk-content[data-loading="true"] [data-no-skeleton] {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
```

This overrides the parent `opacity: 0` for specifically opted-out children — works
because CSS specificity wins over the parent's style.

### 8.4 SSR Usage Pattern

```tsx
// app/page.tsx (Next.js App Router — runs on server)
import { generateStaticBlueprint } from '@autoskeleton/core';
import { AutoSkeleton } from '@autoskeleton/react';

export default async function Page() {
  // Generate blueprint from React tree on the server
  const blueprint = generateStaticBlueprint(<ProductCard />);

  return (
    <AutoSkeleton
      loading={true}     // will be controlled client-side
      blueprint={blueprint}   // pre-computed, skips client measurement on first load
    >
      <ProductCard />
    </AutoSkeleton>
  );
}
```

The `blueprint` prop is serialised in the RSC payload and sent to the client. On
hydration, the client skips measurement and renders immediately using the server
blueprint, then silently upgrades to a dynamic blueprint on next load cycle.

---

## Phase 9 — Accessibility

All skeleton overlays must be properly hidden from assistive technology:

- The overlay `div` must have `aria-hidden="true"`
- The content `div` must keep its normal ARIA tree intact even when visually hidden
  (use `visibility: hidden` / `opacity: 0` — NOT `display: none` — so screen readers
   can still reach the content when needed)
- During loading, add `aria-busy="true"` to the root wrapper
- The `data-no-skeleton` elements remain fully accessible (visibility is not removed)

```tsx
<div className="sk-root" aria-busy={isLoading}>
```

---

## Phase 10 — Test Suite

**Tools**: Vitest + jsdom for unit; Playwright + actual browser for integration.

### Unit tests (Vitest + jsdom)

| Module | Coverage target |
|---|---|
| `role-inferencer` | 95% — all role branches, all edge cases |
| `static-analyzer` | 90% — structural fidelity, JSON serialisability |
| `dynamic-analyzer` | 85% — batching order, each edge case in §4.4 |
| `blueprint-cache` | 100% — get/set/invalidate/GC |
| `animation system` | N/A (CSS, no logic to test) |

### Integration tests (Playwright — real browser)

1. **Basic skeleton appears and fades** — set `loading={true}`, assert skeleton visible;
   set `loading={false}`, assert content visible and skeleton gone after 300ms.
2. **Layout preservation** — measure skeleton block rects, assert they match content
   rects within 2px tolerance.
3. **Multi-line text** — render a `<p>` with known height, assert correct line count.
4. **`data-no-skeleton`** — assert element remains visible during skeleton phase.
5. **Table structure** — render a `<table>`, assert skeleton preserves column count.
6. **`slots` override** — provide a slot function, assert custom element rendered.
7. **Resize invalidation** — resize container, assert blueprint is recomputed.
8. **Cache hit** — trigger loading twice, assert `getBoundingClientRect` call count
   is exactly N on first load and 0 on second (same structure).
9. **SSR blueprint** — render with pre-computed blueprint, assert no measurement rAF.
10. **RTL** — render in RTL container, assert skeleton bars are mirrored.

### Performance benchmark (Node.js script)

```
Measure: time from loading=true to skeleton fully rendered
Target:
  - 50-element component: < 8ms measurement time
  - 200-element component: < 30ms measurement time
  - 500-element component: < 80ms measurement time (acceptable upper bound)
```

Run via `scripts/benchmark.ts` using Playwright with performance tracing.

---

## Phase 11 — Demo App

**Package**: `apps/demo` — Next.js 15, App Router, TypeScript.

### Pages to build

| Route | Purpose |
|---|---|
| `/` | Main showcase — all element types, shimmer toggle, replay button |
| `/ssr` | Demonstrates SSR blueprint path — skeleton visible in page source |
| `/stress` | 300-element component, performance timing display |
| `/rtl` | RTL layout test |
| `/slots` | Custom slot override examples |

### Demo requirements

- Uses App Router with `'use client'` boundaries correctly placed
- The `/ssr` page renders skeleton HTML in source view (view-source shows skeleton divs,
  not just loading spinners)
- Performance panel shows actual measurement time in ms
- All `data-no-skeleton` examples remain interactive during skeleton phase

---

## Phase 12 — Documentation Site

Reuse the demo app. Add an `/docs` route with MDX pages:

1. Getting Started
2. How It Works (pipeline diagram embedded)
3. API Reference
4. Configuration Reference
5. SSR / Next.js Guide
6. Custom Slots
7. Table Support
8. Performance Guide
9. Migration from v1
10. FAQ & Troubleshooting

---

## Phase 13 — Release

1. Run `pnpm size-limit` — confirm both packages within budget.
2. Run full test suite on Node 20, 22.
3. Run Playwright tests on Chromium, Firefox, WebKit.
4. `changeset version` → bump to `2.0.0` with migration notes from v1.
5. `changeset publish` → publishes `@autoskeleton/core` and `@autoskeleton/react` to npm.
6. Deploy demo to Vercel (auto-deploys on main branch merge).

---

## Summary: What this rebuild delivers vs v1

| Capability | v1 | v2 |
|---|---|---|
| DOM measurement reflows | N reflows (one per element) | 1 reflow total |
| Blueprint caching | None | WeakMap + structural hash |
| DOM layers during loading | 3× children | 2× children |
| Shimmer animation | Unimplemented | GPU-composited CSS |
| SSR support | Flash on hydration | Static blueprint, no flash |
| Font timing | Single rAF (fragile) | fonts.ready + double rAF |
| Resize handling | None | ResizeObserver |
| Roles | 6 | 10 (+ video, canvas, avatar, badge) |
| Edge cases handled | ~7 | 14 (see §4.4 matrix) |
| `display:none` handling | Silent 0×0 skeleton | Correctly skipped |
| CSS transform elements | Wrong position | offsetParent chain |
| RTL support | None | Mirrored text bars |
| `<details>` collapsed | 0-height blocks | Skipped |
| Accessibility | aria-hidden on overlay | aria-busy + full ARIA tree |
| Bundle size (gzip) | ~5 KB | ≤ 10 KB total (core+react) |
| Package structure | Single package | core + react (tree-shakeable) |
| Framework support | React only | React now; Vue/Svelte-ready core |

---

*End of build plan. Phases 0–13 are sequential dependencies.
Each phase has a defined input, output, and test contract.
An agent should complete and verify one phase before beginning the next.*
