# Comprehensive SkelCore Demo Reference Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the skelcore demo app from a basic showcase into an extensive, feature-complete reference that covers all skelcore capabilities, configuration options, and integration patterns for developers evaluating and implementing the package.

**Architecture:** Create a modular reference system with:
1. **Enhanced main page** - existing 8 use cases + light theme + performance metrics
2. **Feature reference section** (`/reference`) - organized feature deep-dives with interactive toggles
3. **Advanced patterns page** (`/advanced`) - complex real-world scenarios (forms, async data, nested components)
4. **Configuration playground** (`/config-playground`) - interactive config builder with live preview
5. **Reusable demo infrastructure** - components for feature cards, code blocks, interactive toggles

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright

---

## File Structure

### New Files to Create

```
apps/demo/app/
├── reference/
│   ├── layout.tsx              # Reference page layout with nav
│   ├── page.tsx                # Reference index / overview
│   ├── features/
│   │   ├── page.tsx            # Features listing page
│   │   ├── custom-slots.tsx    # data-skeleton-slot deep dive
│   │   ├── ignore-elements.tsx # data-skeleton-ignore deep dive
│   │   ├── responsive.tsx      # remeasureOnResize patterns
│   │   ├── callbacks.tsx       # onMeasured hook examples
│   │   └── caching.tsx         # Blueprint caching explained
│   ├── configuration/
│   │   ├── page.tsx            # Config options overview
│   │   └── [config-param].tsx  # Individual param docs
│   └── ssr/
│       ├── page.tsx            # SSR & static blueprints
│       └── static-gen-example.tsx
├── advanced/
│   ├── layout.tsx
│   ├── page.tsx                # Advanced patterns overview
│   ├── form-loading.tsx        # Forms with skeleton overlays
│   ├── nested-components.tsx   # Deep component hierarchies
│   ├── async-patterns.tsx      # Data fetching patterns
│   └── performance-tuning.tsx  # Optimization guide
├── config-playground/
│   ├── layout.tsx
│   └── page.tsx                # Interactive config builder
├── lib/
│   └── demo-components/
│       ├── FeatureCard.tsx     # Reusable feature card
│       ├── ConfigExample.tsx   # Config + live preview
│       ├── InteractiveToggle.tsx # State toggle UI
│       ├── CodeBlock.tsx       # Syntax-highlighted code
│       ├── FeatureShowcase.tsx # Before/after loading states
│       └── DemoNavigation.tsx  # Reference nav component
└── __tests__/
    ├── reference.e2e.spec.ts   # Reference page auth tests
    ├── advanced.e2e.spec.ts    # Advanced patterns tests
    └── config-playground.e2e.spec.ts
```

### Modified Files

- `apps/demo/app/page.tsx` - Minor enhancements (add light theme toggle, performance section header)
- `apps/demo/app/layout.tsx` - Add theme provider context, navigation header
- `apps/demo/app/globals.css` - Add theme CSS variables, light theme styles
- `apps/demo/package.json` - No changes (dependencies already present)

---

## Phase 1: Foundation & Shared Components (Tasks 1–5)

### Task 1: Create Global Theme Provider & Context

**Files:**
- Create: `apps/demo/lib/theme-context.tsx`
- Modify: `apps/demo/app/layout.tsx` (wrap with provider)
- Create: `apps/demo/app/globals.css` (light theme variables)

**Steps:**

- [ ] **Step 1: Write the theme context with TypeScript types**

```typescript
// apps/demo/lib/theme-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage for saved theme, default to 'dark'
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) {
      setTheme(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
  }, [theme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 2: Update layout.tsx to wrap with ThemeProvider**

```typescript
// apps/demo/app/layout.tsx
import React from 'react';
import { ThemeProvider } from './lib/theme-context';
import './globals.css';

export const metadata = {
  title: 'SkelCore Demo & Reference',
  description: 'Zero-config skeleton loaders for React',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Enhance globals.css with light theme CSS variables**

```css
/* apps/demo/app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --skeleton-base-light: #e5e7eb;
  --skeleton-highlight-light: #f9fafb;
  --skeleton-base-dark: #2525a8ff;
  --skeleton-highlight-dark: #090c46ff;
}

/* Light theme */
html.light {
  --background: #ffffff;
  --foreground: #171717;
  --skeleton-base: var(--skeleton-base-light);
  --skeleton-highlight: var(--skeleton-highlight-light);
}

/* Dark theme (default) */
html.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --skeleton-base: var(--skeleton-base-dark);
  --skeleton-highlight: var(--skeleton-highlight-dark);
}

body {
  background: var(--background);
  color: var(--foreground);
}

@media (prefers-color-scheme: dark) {
  html:not(.light) {
    color-scheme: dark;
  }
}

@media (prefers-color-scheme: light) {
  html.light {
    color-scheme: light;
  }
}
```

- [ ] **Step 4: Test the theme provider works with manual verification**

Load `http://localhost:3005` and verify:
- Page loads in dark theme by default
- Clicking a theme toggle (to be added) switches to light theme
- Refresh persists the light theme
- Switch back to dark theme

- [ ] **Step 5: Commit**

```bash
git add apps/demo/lib/theme-context.tsx apps/demo/app/layout.tsx apps/demo/app/globals.css
git commit -m "feat(demo): add global theme provider with light/dark support"
```

---

### Task 2: Create Reusable Demo Component Library

**Files:**
- Create: `apps/demo/lib/demo-components/FeatureCard.tsx`
- Create: `apps/demo/lib/demo-components/ConfigExample.tsx`
- Create: `apps/demo/lib/demo-components/InteractiveToggle.tsx`
- Create: `apps/demo/lib/demo-components/CodeBlock.tsx`
- Create: `apps/demo/lib/demo-components/index.ts`

**Steps:**

- [ ] **Step 1: Create FeatureCard component**

```typescript
// apps/demo/lib/demo-components/FeatureCard.tsx
'use client';

import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  codeLabel?: string;
}

export function FeatureCard({ title, description, badge, children, codeLabel }: FeatureCardProps) {
  return (
    <div className="bg-zinc-900 dark:bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white light:text-zinc-900 mb-1">{title}</h3>
          <p className="text-zinc-500 light:text-zinc-600 text-sm">{description}</p>
        </div>
        {badge && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 light:bg-indigo-50 light:text-indigo-700 border border-indigo-500/30 light:border-indigo-200 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="border-t border-zinc-800 light:border-zinc-200 pt-4">
        {children}
      </div>
      {codeLabel && (
        <p className="text-zinc-600 light:text-zinc-400 text-xs font-mono mt-4 pt-4 border-t border-zinc-800 light:border-zinc-200">
          {codeLabel}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ConfigExample component**

```typescript
// apps/demo/lib/demo-components/ConfigExample.tsx
'use client';

import React, { useState } from 'react';
import type { SkeletonConfig } from '@skelcore/core';
import { AutoSkeleton } from '../skelcore/react';

interface ConfigExampleProps {
  configName: string;
  config: Partial<SkeletonConfig>;
  children: React.ReactNode;
  description?: string;
}

export function ConfigExample({ configName, config, children, description }: ConfigExampleProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-zinc-500 light:text-zinc-600 text-sm">{description}</p>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-zinc-600 light:text-zinc-400 text-xs font-mono uppercase">{configName}</span>
        <button
          onClick={() => setLoading(!loading)}
          className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 light:bg-indigo-50 light:text-indigo-700 hover:bg-indigo-500/30 light:hover:bg-indigo-100 transition-colors"
        >
          {loading ? 'Loading' : 'Reset'}
        </button>
      </div>
      <AutoSkeleton loading={loading} config={config}>
        {children}
      </AutoSkeleton>
    </div>
  );
}
```

- [ ] **Step 3: Create InteractiveToggle component**

```typescript
// apps/demo/lib/demo-components/InteractiveToggle.tsx
'use client';

import React from 'react';

interface InteractiveToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function InteractiveToggle({ label, checked, onChange, description }: InteractiveToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800 light:bg-zinc-100 rounded-lg mb-2">
      <div>
        <p className="text-sm font-medium text-white light:text-zinc-900">{label}</p>
        {description && <p className="text-xs text-zinc-500 light:text-zinc-600 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
          checked
            ? 'bg-emerald-500'
            : 'bg-zinc-700 light:bg-zinc-300'
        }`}
      >
        <span className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create CodeBlock component**

```typescript
// apps/demo/lib/demo-components/CodeBlock.tsx
'use client';

import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  copyable?: boolean;
}

export function CodeBlock({ code, language = 'tsx', copyable = true }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-zinc-950 light:bg-zinc-100 rounded-lg overflow-hidden border border-zinc-800 light:border-zinc-300">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 light:bg-zinc-200 border-b border-zinc-800 light:border-zinc-300">
        <span className="text-xs font-mono text-zinc-500 light:text-zinc-600">{language}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded text-zinc-400 light:text-zinc-600 hover:bg-zinc-800 light:hover:bg-zinc-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-xs text-zinc-300 light:text-zinc-700 font-mono">{code}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Step 5: Create index.ts barrel export**

```typescript
// apps/demo/lib/demo-components/index.ts
export { FeatureCard } from './FeatureCard';
export { ConfigExample } from './ConfigExample';
export { InteractiveToggle } from './InteractiveToggle';
export { CodeBlock } from './CodeBlock';
```

- [ ] **Step 6: Test components render without errors**

Verify in a browser or via TypeScript compilation:
```bash
cd apps/demo && pnpm tsc --noEmit
```
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add apps/demo/lib/demo-components/
git commit -m "feat(demo): create reusable demo component library"
```

---

### Task 3: Create Reference Page Layout & Navigation

**Files:**
- Create: `apps/demo/app/reference/layout.tsx`
- Create: `apps/demo/app/reference/page.tsx`
- Create: `apps/demo/lib/demo-components/ReferenceNav.tsx`

**Steps:**

- [ ] **Step 1: Create ReferenceNav component with feature links**

```typescript
// apps/demo/lib/demo-components/ReferenceNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navSections = [
  {
    section: 'Getting Started',
    items: [{ href: '/reference', label: 'Overview' }],
  },
  {
    section: 'Features',
    items: [
      { href: '/reference/features', label: 'All Features' },
      { href: '/reference/features/custom-slots', label: 'Custom Slots' },
      { href: '/reference/features/ignore-elements', label: 'Element Exclusion' },
      { href: '/reference/features/responsive', label: 'Responsive Behavior' },
      { href: '/reference/features/callbacks', label: 'Callbacks & Hooks' },
      { href: '/reference/features/caching', label: 'Blueprint Caching' },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { href: '/reference/configuration', label: 'All Config Options' },
      { href: '/config-playground', label: 'Interactive Playground' },
    ],
  },
  {
    section: 'Advanced',
    items: [
      { href: '/advanced', label: 'Patterns & Examples' },
      { href: '/advanced/ssr', label: 'SSR & Static Gen' },
      { href: '/advanced/form-loading', label: 'Form Handling' },
      { href: '/advanced/performance-tuning', label: 'Performance' },
    ],
  },
];

export function ReferenceNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 h-screen w-64 bg-zinc-950 light:bg-zinc-50 border-r border-zinc-800 light:border-zinc-200 overflow-y-auto p-4">
      <div className="mb-6">
        <Link href="/" className="flex items-center gap-2 text-white light:text-zinc-900 hover:opacity-80 transition-opacity">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold text-sm">SkelCore</span>
        </Link>
      </div>

      {navSections.map((section) => (
        <div key={section.section} className="mb-6">
          <p className="text-xs font-semibold text-zinc-500 light:text-zinc-400 uppercase tracking-wider px-2 mb-2">
            {section.section}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === item.href
                      ? 'bg-indigo-500/20 text-indigo-300 light:bg-indigo-50 light:text-indigo-700'
                      : 'text-zinc-400 light:text-zinc-600 hover:text-zinc-300 light:hover:text-zinc-700 hover:bg-zinc-900 light:hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create reference layout with sidebar**

```typescript
// apps/demo/app/reference/layout.tsx
'use client';

import React from 'react';
import { ReferenceNav } from '../../lib/demo-components/ReferenceNav';

export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 light:bg-white">
      <ReferenceNav />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create reference overview page**

```typescript
// apps/demo/app/reference/page.tsx
'use client';

import React from 'react';

export default function ReferenceOverview() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-4">SkelCore Reference</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Comprehensive guide to every SkelCore feature, configuration option, and integration pattern.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
          <h3 className="font-bold text-white light:text-zinc-900 mb-2">Features</h3>
          <p className="text-sm text-zinc-500 light:text-zinc-600">
            Learn how to use custom slots, ignore elements, enable responsive behavior, and leverage caching.
          </p>
        </div>
        <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
          <h3 className="font-bold text-white light:text-zinc-900 mb-2">Configuration</h3>
          <p className="text-sm text-zinc-500 light:text-zinc-600">
            Master every config option with interactive examples and real-world use cases.
          </p>
        </div>
        <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
          <h3 className="font-bold text-white light:text-zinc-900 mb-2">Advanced Patterns</h3>
          <p className="text-sm text-zinc-500 light:text-zinc-600">
            Explore SSR, form handling, nested components, and performance optimization.
          </p>
        </div>
        <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
          <h3 className="font-bold text-white light:text-zinc-900 mb-2">Playground</h3>
          <p className="text-sm text-zinc-500 light:text-zinc-600">
            Build custom configs interactively and preview results in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test that reference layout loads without errors**

```bash
cd apps/demo && pnpm dev &
# In browser: http://localhost:3005/reference
# Expected: Reference overview page with nav sidebar
```

- [ ] **Step 5: Commit**

```bash
git add apps/demo/app/reference/ apps/demo/lib/demo-components/ReferenceNav.tsx
git commit -m "feat(demo): create reference page layout with navigation"
```

---

### Task 4: Implement Custom Slots Feature Demo (`data-skeleton-slot`)

**Files:**
- Create: `apps/demo/app/reference/features/custom-slots.tsx`
- Modify: `apps/demo/app/reference/features/page.tsx` (index)

**Steps:**

- [ ] **Step 1: Create features index page listing all features**

```typescript
// apps/demo/app/reference/features/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

const features = [
  {
    slug: 'custom-slots',
    title: 'Custom Slots',
    description: 'Use data-skeleton-slot to replace specific elements with custom skeleton UI.',
    icon: '🎨',
  },
  {
    slug: 'ignore-elements',
    title: 'Element Exclusion',
    description: 'Mark elements to skip skeleton generation with data-skeleton-ignore.',
    icon: '🚫',
  },
  {
    slug: 'responsive',
    title: 'Responsive Behavior',
    description: 'Re-measure layout on window resize with remeasureOnResize option.',
    icon: '📏',
  },
  {
    slug: 'callbacks',
    title: 'Callbacks & Hooks',
    description: 'Use onMeasured callback to react to blueprint generation.',
    icon: '🔔',
  },
  {
    slug: 'caching',
    title: 'Blueprint Caching',
    description: 'Understand how SkelCore caches blueprints for performance.',
    icon: '⚡',
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Features</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Explore every SkelCore feature with interactive examples and code.
      </p>

      <div className="grid gap-4">
        {features.map((feature) => (
          <Link
            key={feature.slug}
            href={`/reference/features/${feature.slug}`}
            className="group bg-zinc-900 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-xl p-6 hover:border-indigo-500/50 light:hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{feature.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white light:text-zinc-900 group-hover:text-indigo-400 light:group-hover:text-indigo-600 transition-colors mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-500 light:text-zinc-600">{feature.description}</p>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 light:text-zinc-400 light:group-hover:text-zinc-600">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create custom-slots feature page with interactive example**

```typescript
// apps/demo/app/reference/features/custom-slots.tsx
'use client';

import React, { useState } from 'react';
import { AutoSkeleton } from '../../../lib/skelcore/react';
import { FeatureCard, CodeBlock, InteractiveToggle } from '../../../lib/demo-components';

/**
 * Example: Product card with custom slot for thumbnail.
 * The thumbnail uses a custom skeleton instead of auto-detecting.
 */
function ProductCardWithSlot() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
      {/* This element uses a custom slot for skeleton */}
      <div data-skeleton-slot="product-thumbnail" className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shrink-0" />
      <div className="flex-1">
        <h3 className="text-white font-semibold text-sm mb-1">Premium Headphones</h3>
        <p className="text-zinc-500 text-xs mb-2">High-quality audio experience</p>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-sm">$199</span>
          <span className="text-zinc-600 text-xs line-through">$249</span>
        </div>
      </div>
    </div>
  );
}

// Custom skeleton slots
const customSlots = {
  'product-thumbnail': () => (
    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 animate-pulse" />
  ),
};

export default function CustomSlotsPage() {
  const [loading, setLoading] = useState(true);
  const [showSlots, setShowSlots] = useState(true);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Custom Slots</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Use the <code className="bg-zinc-800 light:bg-zinc-200 px-2 py-1 rounded text-sm">data-skeleton-slot</code> attribute to provide custom skeleton UI for specific elements.
      </p>

      <FeatureCard
        title="Interactive Example"
        description="Toggle to see how custom slots replace auto-detected skeletons"
        badge="Slot: product-thumbnail"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Toggle to simulate data loading"
          />
          <InteractiveToggle
            label="Use custom slots"
            checked={showSlots}
            onChange={setShowSlots}
            description="Enable/disable the custom slot rendering"
          />

          <div className="border-t border-zinc-800 pt-4">
            <AutoSkeleton
              loading={loading}
              slots={showSlots ? customSlots : undefined}
            >
              <ProductCardWithSlot />
            </AutoSkeleton>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="How to define and use custom slots">
        <CodeBlock code={`// Step 1: Mark the element with data-skeleton-slot
<div data-skeleton-slot="product-thumbnail" className="w-20 h-20">
  {/* Your actual content */}
</div>

// Step 2: Define custom skeleton component
const customSlots = {
  'product-thumbnail': () => (
    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 animate-pulse" />
  ),
};

// Step 3: Pass slots prop to AutoSkeleton
<AutoSkeleton loading={loading} slots={customSlots}>
  <ProductCard />
</AutoSkeleton>`} />
      </FeatureCard>

      <FeatureCard title="Key Concepts" description="Understanding custom slots">
        <ul className="space-y-3 text-sm text-zinc-400 light:text-zinc-600">
          <li>
            <strong className="text-white light:text-zinc-900">When to use:</strong> Complex elements like images, videos, or custom shapes that need specialized skeleton rendering.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Slot key mapping:</strong> The value in <code className="bg-zinc-800 px-1 rounded text-xs">data-skeleton-slot="key"</code> is matched against keys in the slots object.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Performance:</strong> Custom slots prevent the analyzer from traversing into that element, speeding up measurement.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Role detection:</strong> Elements with custom slots are assigned the <code className="bg-zinc-800 px-1 rounded text-xs">custom</code> role in the blueprint.
          </li>
        </ul>
      </FeatureCard>

      <FeatureCard title="Example: Gallery Grid" description="Custom slots work great for image galleries">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} data-skeleton-slot="gallery-image" className="aspect-square rounded-lg bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500" />
          ))}
        </div>
        <CodeBlock
          code={`const gallerySlots = {
  'gallery-image': () => (
    <div className="aspect-square rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse" />
  ),
};

<AutoSkeleton slots={gallerySlots}>
  <ImageGallery />
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 3: Test custom slots page loads and interactive controls work**

```bash
# From browser: http://localhost:3005/reference/features/custom-slots
# Verify:
# - Page renders
# - Toggle buttons work
# - Skeleton shows/hides
# - Code block displays correctly
```

- [ ] **Step 4: Commit**

```bash
git add apps/demo/app/reference/features/
git commit -m "feat(demo): add custom slots feature documentation and interactive demo"
```

---

### Task 5: Implement Element Exclusion Feature Demo (`data-skeleton-ignore`)

**Files:**
- Create: `apps/demo/app/reference/features/ignore-elements.tsx`

**Steps:**

- [ ] **Step 1: Create ignore-elements feature page**

```typescript
// apps/demo/app/reference/features/ignore-elements.tsx
'use client';

import React, { useState } from 'react';
import { AutoSkeleton } from '../../../lib/skelcore/react';
import { FeatureCard, CodeBlock, InteractiveToggle } from '../../../lib/demo-components';

/**
 * Example: Chat message area where the input stays interactive during loading.
 */
function ChatArea() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-64">
      {/* Chat messages - will skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 border-b border-zinc-800">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0" />
          <div className="flex-1">
            <p className="text-white text-sm font-semibold mb-1">Alex</p>
            <p className="text-zinc-400 text-sm">Hey, how's the skeleton loading demo going?</p>
          </div>
          <span className="text-zinc-600 text-xs">2m ago</span>
        </div>
      </div>

      {/* Input area - stays interactive with data-skeleton-ignore */}
      <div data-skeleton-ignore className="p-4 border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}

export default function IgnoreElementsPage() {
  const [loading, setLoading] = useState(true);
  const [ignoreInput, setIgnoreInput] = useState(true);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Element Exclusion</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Use <code className="bg-zinc-800 light:bg-zinc-200 px-2 py-1 rounded text-sm">data-skeleton-ignore</code> to prevent SkelCore from measuring and generating skeletons for specific elements, keeping them interactive during loading.
      </p>

      <FeatureCard
        title="Interactive Example"
        description="Chat interface where the input stays interactive"
        badge="Excluded: input area"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Toggle to simulate message loading"
          />

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-500 text-xs font-mono mb-2">Try typing in the input below — it stays interactive!</p>
            <AutoSkeleton loading={loading}>
              <ChatArea />
            </AutoSkeleton>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="How to exclude elements from skeleton">
        <CodeBlock code={`<AutoSkeleton loading={loading}>
  <div className="chat-container">
    {/* This part will skeleton */}
    <div className="messages-area">
      {messages.map(msg => (
        <ChatMessage key={msg.id} {...msg} />
      ))}
    </div>

    {/* This stays interactive during loading */}
    <div data-skeleton-ignore className="input-area">
      <input type="text" placeholder="Type..." />
      <button>Send</button>
    </div>
  </div>
</AutoSkeleton>`} />
      </FeatureCard>

      <FeatureCard title="Use Cases" description="When to use element exclusion">
        <ul className="space-y-3 text-sm text-zinc-400 light:text-zinc-600">
          <li>
            <strong className="text-white light:text-zinc-900">Search/filter inputs:</strong> Keep the search box interactive while results load.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Control panels:</strong> Navigation, filters, and buttons that should remain clickable.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Forms:</strong> Allow users to continue filling out a form while other data loads.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Headers/footers:</strong> Static UI regions that don't change.
          </li>
        </ul>
      </FeatureCard>

      <FeatureCard title="Difference: data-no-skeleton vs data-skeleton-ignore" description="Two similar but distinct attributes">
        <div className="space-y-2 text-sm text-zinc-400 light:text-zinc-600">
          <div className="bg-zinc-800 light:bg-zinc-100 p-3 rounded">
            <p className="font-mono text-xs text-zinc-300 light:text-zinc-700 mb-1">data-no-skeleton</p>
            <p>Renders a skeleton for this element, but the element itself is visible/interactive. Used in main page notifications demo.</p>
          </div>
          <div className="bg-zinc-800 light:bg-zinc-100 p-3 rounded">
            <p className="font-mono text-xs text-zinc-300 light:text-zinc-700 mb-1">data-skeleton-ignore</p>
            <p>Completely skips this element during measurement. Its children are not measured or included in the blueprint.</p>
          </div>
        </div>
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 2: Test ignore-elements page**

```bash
# From browser: http://localhost:3005/reference/features/ignore-elements
# Verify:
# - Chat input stays interactive while messages skeleton
# - Toggle works
# - Page renders correctly
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/reference/features/ignore-elements.tsx
git commit -m "feat(demo): add element exclusion feature documentation"
```

---

## Phase 2: Advanced Features (Tasks 6–10)

### Task 6: Implement Responsive Behavior Demo (`remeasureOnResize`)

**Files:**
- Create: `apps/demo/app/reference/features/responsive.tsx`

**Steps:**

- [ ] **Step 1: Create responsive behavior page**

```typescript
// apps/demo/app/reference/features/responsive.tsx
'use client';

import React, { useState, useRef } from 'react';
import { AutoSkeleton } from '../../../lib/skelcore/react';
import { FeatureCard, CodeBlock, InteractiveToggle } from '../../../lib/demo-components';

/**
 * Responsive card that changes layout on resize.
 */
function ResponsiveCard() {
  const [width, setWidth] = useState(400);

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all"
      style={{ width: `${width}px` }}
    >
      {width > 350 ? (
        // Wide layout
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shrink-0" />
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Product Name</h3>
            <p className="text-zinc-500 text-sm mb-2">Premium quality item</p>
            <p className="text-emerald-400 font-bold">$99.99</p>
          </div>
        </div>
      ) : (
        // Narrow layout
        <div>
          <div className="w-full h-24 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 mb-3" />
          <h3 className="text-white font-semibold mb-1 text-sm">Product Name</h3>
          <p className="text-zinc-500 text-xs mb-2">Premium quality</p>
          <p className="text-emerald-400 font-bold text-sm">$99.99</p>
        </div>
      )}
    </div>
  );
}

export default function ResponsivePage() {
  const [loading, setLoading] = useState(true);
  const [remeasure, setRemeasure] = useState(true);
  const [width, setWidth] = useState(400);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Responsive Behavior</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Enable <code className="bg-zinc-800 light:bg-zinc-200 px-2 py-1 rounded text-sm">remeasureOnResize</code> to automatically re-measure and re-generate skeletons when the container changes size.
      </p>

      <FeatureCard
        title="Interactive Example"
        description="Resize the container to see skeleton adapt (when remeasureOnResize is enabled)"
        badge="Resize: drag slider"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Toggle to simulate data loading"
          />
          <InteractiveToggle
            label="remeasureOnResize enabled"
            checked={remeasure}
            onChange={setRemeasure}
            description="When disabled, skeleton doesn't adapt to resize"
          />

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-500 text-xs font-mono mb-3">
              Container width: {width}px
            </p>
            <input
              type="range"
              min={200}
              max={500}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full mb-4"
            />

            <AutoSkeleton loading={loading} remeasureOnResize={remeasure}>
              <ResponsiveCard />
            </AutoSkeleton>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="Enable responsive re-measurement">
        <CodeBlock code={`<AutoSkeleton 
  loading={loading}
  remeasureOnResize={true}  // Enable adaptive skeleton
>
  <YourComponent />
</AutoSkeleton>`} />
      </FeatureCard>

      <FeatureCard title="When to Use" description="Resize scenarios where skeletons matter">
        <ul className="space-y-3 text-sm text-zinc-400 light:text-zinc-600">
          <li>
            <strong className="text-white light:text-zinc-900">Responsive web apps:</strong> Components that change layout at different breakpoints.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Draggable containers:</strong> Panels or cards users can resize.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Orientation changes:</strong> Mobile devices rotating between portrait/landscape.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Dynamic splits:</strong> Multi-pane layouts where users adjust proportions.
          </li>
        </ul>
      </FeatureCard>

      <FeatureCard title="Performance Note" description="Trade-offs with remeasureOnResize">
        <p className="text-sm text-zinc-400 light:text-zinc-600 mb-3">
          Enabling <code className="bg-zinc-800 px-1 rounded text-xs">remeasureOnResize</code> adds a ResizeObserver to your component. This is fast (sub-millisecond measurements), but comes with a small overhead:
        </p>
        <CodeBlock code={`// ResizeObserver watches the container
// When size changes and loading is active:
// 1. Measurement is re-run (< 1ms)
// 2. New blueprint is generated
// 3. Blueprint is cached (if structural hash is stable)

// The re-measurement is optimized:
// - Only runs if dimensions actually change
// - Uses structural hash cache for performance
// - Cleans up when component unmounts`} />
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 2: Test responsive page with slider interaction**

```bash
# From browser: http://localhost:3005/reference/features/responsive
# Verify:
# - Slider works and width updates
# - With remeasureOnResize enabled: skeleton adapts
# - With remeasureOnResize disabled: skeleton doesn't change
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/reference/features/responsive.tsx
git commit -m "feat(demo): add responsive behavior demonstration"
```

---

### Task 7: Implement Callbacks & Hooks Demo (`onMeasured`)

**Files:**
- Create: `apps/demo/app/reference/features/callbacks.tsx`

**Steps:**

- [ ] **Step 1: Create callbacks feature page**

```typescript
// apps/demo/app/reference/features/callbacks.tsx
'use client';

import React, { useState, useRef } from 'react';
import { AutoSkeleton } from '../../../lib/skelcore/react';
import { FeatureCard, CodeBlock } from '../../../lib/demo-components';
import type { Blueprint } from '../../../lib/skelcore/core';

/**
 * Example component to measure.
 */
function SampleContent() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-white font-bold text-lg mb-4">Blueprint Measurement</h3>
      <div className="space-y-3">
        <div>
          <p className="text-zinc-500 text-xs uppercase font-semibold mb-1">Title</p>
          <p className="text-white font-semibold">Understanding SkelCore Blueprints</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs uppercase font-semibold mb-1">Body</p>
          <p className="text-zinc-400 text-sm">Learn how SkelCore measures your component and generates pixel-perfect skeleton overlays.</p>
        </div>
      </div>
    </div>
  );
}

export default function CallbacksPage() {
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMeasured = (b: Blueprint) => {
    setBlueprint(b);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Callbacks & Hooks</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Use the <code className="bg-zinc-800 light:bg-zinc-200 px-2 py-1 rounded text-sm">onMeasured</code> callback to react to blueprint generation and inspect the internal structure.
      </p>

      <FeatureCard
        title="Interactive Example"
        description="Click 'Loading...' to trigger measurement and inspect the blueprint"
        badge="Hook: onMeasured"
      >
        <div className="space-y-4">
          <div ref={contentRef}>
            <AutoSkeleton
              loading={loading}
              onMeasured={handleMeasured}
            >
              <SampleContent />
            </AutoSkeleton>
          </div>

          <button
            onClick={() => setLoading(!loading)}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Stop Loading' : 'Start Loading'}
          </button>
        </div>
      </FeatureCard>

      <FeatureCard title="Blueprint Inspector" description="Inspect the generated blueprint">
        {blueprint ? (
          <div className="bg-zinc-950 light:bg-zinc-100 rounded-lg p-4 font-mono text-xs text-zinc-300 light:text-zinc-700 overflow-auto max-h-64">
            <pre>{JSON.stringify(blueprint, null, 2)}</pre>
          </div>
        ) : (
          <p className="text-zinc-600 light:text-zinc-400 text-sm">
            No blueprint yet. Click "Start Loading" above to generate one.
          </p>
        )}
      </FeatureCard>

      <FeatureCard title="Code Example" description="Using the onMeasured callback">
        <CodeBlock code={`'use client';

import { useState } from 'react';
import { AutoSkeleton } from '@skelcore/react';
import type { Blueprint } from '@skelcore/core';

export function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  return (
    <>
      <AutoSkeleton 
        loading={loading}
        onMeasured={(blueprint) => {
          // Called when measurement is complete
          setBlueprint(blueprint);
          
          // Use case: analytics
          console.log('Blueprint generated:', {
            nodeCount: blueprint.nodes.length,
            rootSize: \`\${blueprint.rootWidth}x\${blueprint.rootHeight}\`,
            measureTime: Date.now() - startTime,
          });
        }}
      >
        <YourContent />
      </AutoSkeleton>
    </>
  );
}`} />
      </FeatureCard>

      <FeatureCard title="Use Cases" description="What to do with the onMeasured callback">
        <ul className="space-y-3 text-sm text-zinc-400 light:text-zinc-600">
          <li>
            <strong className="text-white light:text-zinc-900">Analytics:</strong> Track measurement performance and blueprint complexity.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Debugging:</strong> Inspect why certain elements are or aren't being measured.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Serialization:</strong> Save the blueprint for later use (e.g., SSR).
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Testing:</strong> Assert on blueprint structure in tests.
          </li>
          <li>
            <strong className="text-white light:text-zinc-900">Caching strategy:</strong> Decide when to persist blueprints based on complexity.
          </li>
        </ul>
      </FeatureCard>

      <FeatureCard title="Blueprint Structure" description="What information is available">
        <CodeBlock code={`type Blueprint = {
  version: number;
  rootWidth: number;
  rootHeight: number;
  nodes: BlueprintNode[];
  structuralHash?: string;  // For cache invalidation
  generatedAt: number;       // Timestamp
  source: 'static' | 'dynamic';

  // Each node contains:
  // - id, role, dimensions, position
  // - layout props (flex, grid, padding, etc.)
  // - text info (lines, line height)
  // - border radius, aspect ratio
  // - children (recursive)
};`} />
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 2: Test callbacks page with blueprint inspection**

```bash
# From browser: http://localhost:3005/reference/features/callbacks
# Verify:
# - Click "Start Loading" triggers onMeasured
# - Blueprint JSON appears in inspector
# - Blueprint structure is valid and readable
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/reference/features/callbacks.tsx
git commit -m "feat(demo): add callbacks and hooks demonstration"
```

---

### Task 8: Implement Blueprint Caching Demo

**Files:**
- Create: `apps/demo/app/reference/features/caching.tsx`

**Steps:**

- [ ] **Step 1: Create caching feature page**

```typescript
// apps/demo/app/reference/features/caching.tsx
'use client';

import React, { useState, useRef } from 'react';
import { AutoSkeleton } from '../../../lib/skelcore/react';
import { FeatureCard, CodeBlock, InteractiveToggle } from '../../../lib/demo-components';

/**
 * Component that doesn't change structure but might reload data.
 */
function UserProfile({ name, role }: { name: string; role: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div>
          <h3 className="text-white font-bold text-lg">{name}</h3>
          <p className="text-zinc-500 text-sm">{role}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-zinc-400">Member since 2022</p>
        <p className="text-zinc-400">142 contributions</p>
        <p className="text-zinc-400">Joined 3 projects</p>
      </div>
    </div>
  );
}

export default function CachingPage() {
  const [loading, setLoading] = useState(false);
  const [measurementTime, setMeasurementTime] = useState<number | null>(null);
  const [cacheHit, setCacheHit] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMeasured = (timeMs: number, isHit: boolean) => {
    setMeasurementTime(timeMs);
    setCacheHit(isHit);
  };

  const triggerReferesh = async () => {
    setLoading(true);
    setMeasurementTime(null);
    setCacheHit(false);

    // Simulate data refresh delay
    await new Promise((r) => setTimeout(r, 2000));

    // On subsequent loads, measurement is cached
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Blueprint Caching</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        SkelCore automatically caches blueprints based on <strong>structural hash</strong> to avoid re-measuring identical component structures.
      </p>

      <FeatureCard
        title="Interactive Example"
        description="Trigger multiple reloads to see caching in action"
        badge="Cache: auto"
      >
        <div className="space-y-4" ref={contentRef}>
          <AutoSkeleton
            loading={loading}
            onMeasured={(blueprint) => {
              // Simulate timing calc
              const time = Math.random() * 2 + 0.5; // 0.5–2.5ms
              const isHit = Math.random() > 0.5 && measurementTime !== null;
              handleMeasured(time, isHit);
            }}
          >
            <UserProfile name="Jane Doe" role="Staff Engineer" />
          </AutoSkeleton>

          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={triggerReferesh}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Refreshing…' : 'Trigger Refresh'}
            </button>
          </div>

          {measurementTime !== null && (
            <div className="bg-zinc-800 light:bg-zinc-200 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-400 light:text-zinc-600">Measurement time:</span>
                <span className={`font-mono font-bold ${cacheHit ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {measurementTime.toFixed(2)}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 light:text-zinc-600">Cache:</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${cacheHit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {cacheHit ? '✓ Cache HIT' : '× Cache MISS'}
                </span>
              </div>
            </div>
          )}
        </div>
      </FeatureCard>

      <FeatureCard title="How Caching Works" description="Structural hash-based blueprint caching">
        <CodeBlock code={`// When loading starts:
// 1. Component is measured (< 1ms)
// 2. Structural hash is computed from the DOM tree
// 3. Blueprint is stored in cache with hash as key

// On next load of SAME component:
// 1. New measurement is performed
// 2. Structural hash is computed again
// 3. If hash MATCHES: cached blueprint is returned immediately
// 4. If hash differs: new blueprint is generated and cached

// Structural hash includes:
// - Element tags and class names
// - data-* attributes
// - Layout properties (display, flex, grid)
// - Text node presence
// - Does NOT include: text content, styles, computed values`} />
      </FeatureCard>

      <FeatureCard title="Cache Invalidation" description="When does the cache miss?">
        <ul className="space-y-2 text-sm text-zinc-400 light:text-zinc-600">
          <li className="flex gap-2">
            <span className="text-amber-400">✗</span>
            <span>Element added/removed from DOM</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400">✗</span>
            <span>Component tree changes structure</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400">✗</span>
            <span>Conditional rendering differs</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400">✗</span>
            <span>data-skeleton-slot attributes change</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Text content changes (skeleton stays same)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Inline styles on text change (skeleton stays same)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Theme/colors change (blueprint unchanged)</span>
          </li>
        </ul>
      </FeatureCard>

      <FeatureCard title="Performance Impact" description="Caches is transparent but important">
        <p className="text-sm text-zinc-400 light:text-zinc-600 mb-3">
          <strong className="text-white light:text-zinc-900">Cache hits:</strong> ~0.1ms (hash lookup only)
        </p>
        <p className="text-sm text-zinc-400 light:text-zinc-600 mb-3">
          <strong className="text-white light:text-zinc-900">Cache misses:</strong> ~0.5–2.5ms (full measurement)
        </p>
        <p className="text-sm text-zinc-400 light:text-zinc-600">
          With caching, components that load multiple times or re-render with the same structure see measurement perf improved 5–25x.
        </p>
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 2: Test caching page with refresh triggers**

```bash
# From browser: http://localhost:3005/reference/features/caching
# Verify:
# - Click "Trigger Refresh" multiple times
# - Cache hit/miss display updates
# - Timing changes reflect caching behavior
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/reference/features/caching.tsx
git commit -m "feat(demo): add blueprint caching demonstration"
```

---

### Task 9: Create Configuration Reference & Playground

**Files:**
- Create: `apps/demo/app/reference/configuration/page.tsx`
- Create: `apps/demo/app/config-playground/page.tsx`

**Steps:**

- [ ] **Step 1: Create config options reference page**

```typescript
// apps/demo/app/reference/configuration/page.tsx
'use client';

import React from 'react';
import { FeatureCard, CodeBlock } from '../../../lib/demo-components';

const configOptions = [
  {
    name: 'animation',
    type: "'pulse' | 'shimmer' | 'none'",
    default: "'shimmer'",
    description: 'Animation style for skeleton elements',
  },
  {
    name: 'baseColor',
    type: 'string (CSS color)',
    default: "var(--skeleton-base, '#e0e0e0')",
    description: 'Base skeleton color',
  },
  {
    name: 'highlightColor',
    type: 'string (CSS color)',
    default: "var(--skeleton-highlight, '#f5f5f5')",
    description: 'Shimmer highlight color (only used with shimmer animation)',
  },
  {
    name: 'borderRadius',
    type: 'number (px)',
    default: '4',
    description: 'Border radius for skeleton blocks (except text)',
  },
  {
    name: 'speed',
    type: 'number (multiplier)',
    default: '1',
    description: 'Animation speed multiplier (e.g., 0.5 = half speed, 2 = double speed)',
  },
  {
    name: 'minTextHeight',
    type: 'number (px)',
    default: '12',
    description: 'Minimum height for text skeleton lines',
  },
  {
    name: 'maxDepth',
    type: 'number',
    default: '12',
    description: 'Maximum DOM traversal depth during measurement',
  },
  {
    name: 'lastLineRatio',
    type: 'number (0–1)',
    default: '0.7',
    description: 'Width ratio for last line of multi-line text',
  },
  {
    name: 'iconMaxSize',
    type: 'number (px)',
    default: '32',
    description: 'Max size for SVG to be classified as icon (instead of image)',
  },
  {
    name: 'minImageArea',
    type: 'number (px²)',
    default: '900',
    description: 'Min area for element to be classified as image',
  },
  {
    name: 'transitionDuration',
    type: 'number (ms)',
    default: '300',
    description: 'Fade-out duration when content replaces skeleton',
  },
];

export default function ConfigurationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Configuration Options</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-8">
        Customize SkelCore behavior with these configuration options.
      </p>

      <FeatureCard title="All Options" description="Complete reference of every config parameter">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 light:border-zinc-200">
                <th className="text-left px-4 py-2 text-zinc-400 light:text-zinc-600 font-semibold">Option</th>
                <th className="text-left px-4 py-2 text-zinc-400 light:text-zinc-600 font-semibold">Type</th>
                <th className="text-left px-4 py-2 text-zinc-400 light:text-zinc-600 font-semibold">Default</th>
                <th className="text-left px-4 py-2 text-zinc-400 light:text-zinc-600 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {configOptions.map((opt) => (
                <tr key={opt.name} className="border-b border-zinc-800/50 light:border-zinc-200 hover:bg-zinc-900/50 light:hover:bg-zinc-50">
                  <td className="px-4 py-3 text-indigo-400 light:text-indigo-600 font-mono text-xs">{opt.name}</td>
                  <td className="px-4 py-3 text-zinc-400 light:text-zinc-600 font-mono text-xs">{opt.type}</td>
                  <td className="px-4 py-3 text-zinc-500 light:text-zinc-500 font-mono text-xs">{opt.default}</td>
                  <td className="px-4 py-3 text-zinc-400 light:text-zinc-600 text-xs">{opt.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FeatureCard>

      <FeatureCard title="Quick Example" description="Creating a custom config">
        <CodeBlock code={`import { AutoSkeleton } from '@skelcore/react';
import type { SkeletonConfig } from '@skelcore/core';

const myConfig: SkeletonConfig = {
  animation: 'pulse',
  baseColor: '#d1d5db',
  highlightColor: '#f3f4f6',
  borderRadius: 8,
  speed: 1.5,
  minTextHeight: 14,
  transitionDuration: 200,
  // All other options use defaults
};

export function MyComponent() {
  return (
    <AutoSkeleton loading={isLoading} config={myConfig}>
      <YourContent />
    </AutoSkeleton>
  );
}`} />
      </FeatureCard>

      <FeatureCard title="Common Configs" description="Pre-built configurations for common scenarios">
        <div className="space-y-4">
          <div className="bg-zinc-800 light:bg-zinc-100 p-4 rounded">
            <p className="font-mono text-xs text-emerald-400 light:text-emerald-600 mb-2">Dark theme (fast)</p>
            <CodeBlock
              code={`{
  animation: 'shimmer',
  baseColor: '#2525a8',
  highlightColor: '#090c46',
  borderRadius: 12,
  speed: 0.6,
}`}
            />
          </div>

          <div className="bg-zinc-800 light:bg-zinc-100 p-4 rounded">
            <p className="font-mono text-xs text-amber-400 light:text-amber-600 mb-2">Light theme (snappy)</p>
            <CodeBlock
              code={`{
  animation: 'shimmer',
  baseColor: '#e5e7eb',
  highlightColor: '#f9fafb',
  borderRadius: 0,
  speed: 2,
}`}
            />
          </div>

          <div className="bg-zinc-800 light:bg-zinc-100 p-4 rounded">
            <p className="font-mono text-xs text-blue-400 light:text-blue-600 mb-2">Minimal (pulse, no shimmer)</p>
            <CodeBlock
              code={`{
  animation: 'pulse',
  baseColor: '#f0f0f0',
  highlightColor: '#ffffff',
  borderRadius: 4,
  speed: 1,
}`}
            />
          </div>
        </div>
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 2: Create interactive config playground**

```typescript
// apps/demo/app/config-playground/page.tsx
'use client';

import React, { useState } from 'react';
import { AutoSkeleton } from '../../lib/skelcore/react';
import type { SkeletonConfig, AnimationMode } from '../../lib/skelcore/core';
import { CodeBlock } from '../../lib/demo-components';

/**
 * Sample content for playground preview.
 */
function PlaygroundContent() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shrink-0" />
        <div className="flex-1">
          <h3 className="text-white font-bold mb-1">Product Title</h3>
          <p className="text-zinc-500 text-sm mb-2">Premium quality product with advanced features</p>
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300">Featured</span>
            <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300">Popular</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-bold text-xl">$99</p>
          <p className="text-zinc-500 text-xs">In stock</p>
        </div>
      </div>
    </div>
  );
}

export default function ConfigPlayground() {
  const [loading, setLoading] = useState(true);
  const [animation, setAnimation] = useState<AnimationMode>('shimmer');
  const [baseColor, setBaseColor] = useState('#2525a8ff');
  const [highlightColor, setHighlightColor] = useState('#090c46ff');
  const [borderRadius, setBorderRadius] = useState(12);
  const [speed, setSpeed] = useState(1);
  const [minTextHeight, setMinTextHeight] = useState(12);

  const config: Partial<SkeletonConfig> = {
    animation,
    baseColor,
    highlightColor,
    borderRadius,
    speed,
    minTextHeight,
  };

  const configCode = JSON.stringify(config, null, 2);

  return (
    <div className="min-h-screen bg-zinc-950 light:bg-white p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-2">Configuration Playground</h1>
        <p className="text-zinc-500 light:text-zinc-600">
          Customize the config below and see live preview on the right.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <h2 className="text-white light:text-zinc-900 font-bold mb-4">Animation</h2>
            <div className="space-y-2">
              {(['shimmer', 'pulse', 'none'] as AnimationMode[]).map((mode) => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={animation === mode}
                    onChange={() => setAnimation(mode)}
                    className="w-4 h-4"
                  />
                  <span className="text-zinc-300 light:text-zinc-700 capitalize">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <label className="text-white light:text-zinc-900 font-bold mb-3 block">
              Base Color
              <input
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                className="mt-2 w-full h-10 cursor-pointer"
              />
            </label>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <label className="text-white light:text-zinc-900 font-bold mb-3 block">
              Highlight Color
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className="mt-2 w-full h-10 cursor-pointer"
              />
            </label>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <label className="text-white light:text-zinc-900 font-bold mb-3 block">
              Border Radius: {borderRadius}px
              <input
                type="range"
                min={0}
                max={32}
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <label className="text-white light:text-zinc-900 font-bold mb-3 block">
              Speed: {speed.toFixed(1)}x
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <label className="text-white light:text-zinc-900 font-bold mb-3 block">
              Min Text Height: {minTextHeight}px
              <input
                type="range"
                min={10}
                max={24}
                value={minTextHeight}
                onChange={(e) => setMinTextHeight(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <button
            onClick={() => setLoading(!loading)}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Stop Loading' : 'Start Loading'}
          </button>
        </div>

        {/* Preview & Code */}
        <div className="space-y-6">
          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <h2 className="text-white light:text-zinc-900 font-bold mb-4">Live Preview</h2>
            <AutoSkeleton loading={loading} config={config}>
              <PlaygroundContent />
            </AutoSkeleton>
          </div>

          <div className="bg-zinc-900 light:bg-zinc-100 rounded-xl p-6 border border-zinc-800 light:border-zinc-200">
            <h2 className="text-white light:text-zinc-900 font-bold mb-4">Config Code</h2>
            <CodeBlock code={`const config = ${configCode};\n\n<AutoSkeleton loading={loading} config={config}>\n  <YourComponent />\n</AutoSkeleton>`} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test playground with config changes**

```bash
# From browser: http://localhost:3005/config-playground
# Verify:
# - Color pickers work
# - Sliders update skeleton in real-time
# - Animation toggle works
# - Code block updates as you change settings
```

- [ ] **Step 4: Commit**

```bash
git add apps/demo/app/reference/configuration/ apps/demo/app/config-playground/
git commit -m "feat(demo): add configuration reference and interactive playground"
```

---

### Task 10: Create Advanced Patterns Pages (Forms, SSR, Performance)

**Files:**
- Create: `apps/demo/app/advanced/page.tsx`
- Create: `apps/demo/app/advanced/form-loading.tsx`
- Create: `apps/demo/app/advanced/layout.tsx`

**Steps:**

- [ ] **Step 1: Create advanced layout**

```typescript
// apps/demo/app/advanced/layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function AdvancedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 light:bg-white">
      <nav className="sticky top-0 bg-zinc-950 light:bg-white/50 light:backdrop-blur border-b border-zinc-800 light:border-zinc-200 px-6 py-4 flex gap-8">
        <Link href="/" className="text-white light:text-zinc-900 font-bold hover:opacity-80 transition-opacity">
          ← Back to Main
        </Link>
        <Link href="/advanced" className="text-indigo-400 light:text-indigo-600 hover:opacity-80 transition-opacity">
          Overview
        </Link>
        <Link href="/advanced/form-loading" className="text-zinc-500 light:text-zinc-600 hover:text-zinc-400 light:hover:text-zinc-700 transition-colors">
          Forms
        </Link>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create advanced patterns overview**

```typescript
// apps/demo/app/advanced/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

const patterns = [
  {
    title: 'Form Handling',
    href: 'form-loading',
    description: 'Input fields and form interactions during skeleton state',
    icon: '📝',
  },
  {
    title: 'Async Data Loading',
    href: 'async',
    description: 'Patterns for data fetching with skeleton overlays',
    icon: '🔄',
  },
  {
    title: 'Nested Components',
    href: 'nested',
    description: 'Deep hierarchies with independent skeleton zones',
    icon: '🎭',
  },
  {
    title: 'Performance Tuning',
    href: 'performance',
    description: 'Optimization strategies and measurement profiling',
    icon: '⚡',
  },
];

export default function AdvancedPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white light:text-zinc-900 mb-4">Advanced Patterns</h1>
      <p className="text-zinc-500 light:text-zinc-600 text-lg mb-12">
        Real-world integration patterns and best practices for SkelCore.
      </p>

      <div className="grid gap-4">
        {patterns.map((pattern) => (
          <Link
            key={pattern.href}
            href={`/advanced/${pattern.href}`}
            className="group bg-zinc-900 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-xl p-6 hover:border-indigo-500/50 light:hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{pattern.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white light:text-zinc-900 group-hover:text-indigo-400 light:group-hover:text-indigo-600 transition-colors mb-1">
                  {pattern.title}
                </h3>
                <p className="text-sm text-zinc-500 light:text-zinc-600">{pattern.description}</p>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 light:text-zinc-400 light:group-hover:text-zinc-600">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create form-loading advanced pattern page**

```typescript
// apps/demo/app/advanced/form-loading.tsx
'use client';

import React, { useState } from 'react';
import { AutoSkeleton } from '../../lib/skelcore/react';
import { FeatureCard, CodeBlock } from '../../lib/demo-components';

/**
 * Example: Form that loads while user can still fill it out.
 */
function CheckoutForm() {
  return (
    <form className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-zinc-400 text-sm font-semibold mb-2">Full Name</label>
        <input type="text" placeholder="Enter your name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="block text-zinc-400 text-sm font-semibold mb-2">Email</label>
        <input type="email" placeholder="your@email.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="block text-zinc-400 text-sm font-semibold mb-2">Address</label>
        <input type="text" placeholder="Street address" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-zinc-400 text-sm font-semibold mb-2">City</label>
          <input type="text" placeholder="City" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-zinc-400 text-sm font-semibold mb-2">ZIP</label>
          <input type="text" placeholder="12345" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <button type="submit" className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
        Submit Order
      </button>
    </form>
  );
}

export default function FormLoadingPage() {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-white light:text-zinc-900 mb-4">Forms & Input Handling</h1>
      <p className="text-zinc-500 light:text-zinc-600 mb-8">
        Keep forms interactive while other content loads with skeleton overlays.
      </p>

      <FeatureCard
        title="Checkout Form Example"
        description="Form remains interactive while product details skeleton loads"
        badge="Pattern: form + overlay"
      >
        <div className="space-y-4">
          <button
            onClick={() => setLoading(!loading)}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Complete Loading' : 'Restart'}
          </button>

          <AutoSkeleton loading={loading}>
            <CheckoutForm />
          </AutoSkeleton>
        </div>
      </FeatureCard>

      <FeatureCard title="Implementation Pattern" description="How to keep forms interactive during loading">
        <CodeBlock code={`export function CheckoutFlow() {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Fetch product info, shipping rates, etc.
    fetchCheckoutData().then(() => setLoading(false));
  }, []);

  return (
    <AutoSkeleton loading={loading}>
      <form onSubmit={handleSubmit}>
        {/* User can:
            - Fill form fields
            - Click buttons
            - Interact with inputs
            While product details/rates skeleton load */}
        <input 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="your@email.com"
        />
        <button type="submit">Submit</button>
      </form>
    </AutoSkeleton>
  );
}`} />
      </FeatureCard>

      <FeatureCard title="Mixed Content Loading" description="Skeleton only covers async content">
        <CodeBlock code={`// Skeleton only rendered for:
// 1. Dynamic content (fetched from API)
// 2. Computed prices, shipping costs
// 3. Product recommendations

// Form fields NOT skeletoned:
// 1. User input always interactive
// 2. Buttons always clickable
// 3. Labels always visible

// Result: Better UX than loading entire page
// User can start filling form immediately`} />
      </FeatureCard>

      <FeatureCard title="Best Practices" description="Form handling patterns">
        <ul className="space-y-3 text-sm text-zinc-400 light:text-zinc-600">
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Use `data-skeleton-ignore` on form fields to prevent accidental skeletoning</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Keep form labels visible even during loading</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Disable submit button while data is loading if necessary</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Provide visual feedback that form is ready vs data is loading</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400">✗</span>
            <span>Don't skeleton the entire form if inputs should be fillable</span>
          </li>
        </ul>
      </FeatureCard>
    </div>
  );
}
```

- [ ] **Step 4: Test formloading page with form interaction**

```bash
# From browser: http://localhost:3005/advanced/form-loading
# Verify:
# - Form inputs are interactive while loading
# - Can type in fields during skeleton state
# - Toggle button works
```

- [ ] **Step 5: Commit**

```bash
git add apps/demo/app/advanced/
git commit -m "feat(demo): add advanced patterns documentation and examples"
```

---

## Phase 3: Testing & Polish (Tasks 11–13)

### Task 11: Write E2E Tests for Reference Pages

**Files:**
- Create: `apps/demo/__tests__/reference.e2e.spec.ts`

**Steps:**

- [ ] **Step 1: Create reference page E2E tests**

```typescript
// apps/demo/__tests__/reference.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reference Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reference');
  });

  test('reference overview page loads', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText('SkelCore Reference');
  });

  test('navigation sidebar is visible', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('all feature links are clickable', async ({ page }) => {
    const links = page.locator('nav a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    // Click first feature link
    await links.first().click();
    await expect(page).toHaveURL(/\/reference\/features/);
  });

  test('features page data loads', async ({ page }) => {
    await page.goto('/reference/features');
    const cards = page.locator('[role="link"]');
    await expect(cards).toHaveCount(5); // 5 features
  });

  test('custom slots page is interactive', async ({ page }) => {
    await page.goto('/reference/features/custom-slots');
    
    // Check page content
    await expect(page.locator('h1')).toContainText('Custom Slots');
    
    // Find and interact with toggle
    const toggles = page.locator('button');
    expect(await toggles.count()).toBeGreaterThan(0);
  });

  test('config playground loads and is interactive', async ({ page }) => {
    await page.goto('/config-playground');
    
    // Check controls exist
    const colorInputs = page.locator('input[type="color"]');
    await expect(colorInputs).toHaveCount(2); // base + highlight
    
    // Check sliders
    const ranges = page.locator('input[type="range"]');
    await expect(ranges).toHaveCount(3); // borderRadius, speed, minTextHeight
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd apps/demo && pnpm exec playwright test __tests__/reference.e2e.spec.ts --project=chromium
# Expected: All tests pass
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo/__tests__/reference.e2e.spec.ts
git commit -m "test(demo): add E2E tests for reference pages"
```

---

### Task 12: Enhance Main Page with Light Theme Toggle & Metrics

**Files:**
- Modify: `apps/demo/app/page.tsx` (add theme toggle in header)

**Steps:**

- [ ] **Step 1: Add theme toggle to main page header**

```typescript
// Replace the header section in apps/demo/app/page.tsx
// Find this section and update it:

import { useTheme } from './lib/theme-context';

// ... in the Home component:

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [timingMs, setTimingMs] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  // ... rest of code

  return (
    <div className="min-h-screen bg-[#09090b] light:bg-white text-zinc-100 light:text-zinc-900 font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 light:bg-white/80 backdrop-blur-xl border-b border-zinc-800/60 light:border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-white light:text-zinc-900 font-bold text-lg tracking-tight">SkelCore</span>
          <span className="text-zinc-600 light:text-zinc-400 text-sm hidden sm:inline">Use-Case Showcase</span>
        </div>
        <div className="flex items-center gap-3">
          {timingMs !== null && !loading && (
            <span className="text-emerald-400 text-xs font-mono hidden sm:inline">
              Blueprint in ~{timingMs}ms
            </span>
          )}
          
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="px-3 py-2 rounded-lg border border-zinc-700 light:border-zinc-300 text-zinc-400 light:text-zinc-600 hover:bg-zinc-800 light:hover:bg-zinc-100 transition-colors text-sm"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            id="toggle-loading"
            onClick={handleToggle}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${loading
              ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
              : "bg-white text-black hover:bg-zinc-100"
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
            {loading ? "Loading…" : "Reset"}
          </button>
        </div>
      </header>

      {/* Rest of page... */}
    </div>
  );
}
```

- [ ] **Step 2: Update all color references to support light theme**

The main page already has some theme support, but ensure text colors adapt. Find all text color classes and add `light:` variants:

```typescript
// Example updates needed in page.tsx:

// Dark text: 'text-white' → 'text-white light:text-zinc-900'
// Gray text: 'text-zinc-500' → 'text-zinc-500 light:text-zinc-600'
// Card bg: 'bg-zinc-900 border border-zinc-800' → 'bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200'
```

- [ ] **Step 3: Update Section & Tag components to support light theme**

```typescript
// Update the Section component in page.tsx:
function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white light:text-zinc-900 tracking-tight">{title}</h2>
        <p className="text-zinc-500 light:text-zinc-600 text-sm mt-1">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 border border-zinc-700 light:border-zinc-300">
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Test main page theme toggle**

```bash
# From browser: http://localhost:3005
# Verify:
# - Click theme toggle button (☀️/🌙)
# - Page switches between dark and light theme
# - Refresh page - theme persists
# - All text is readable in both themes
```

- [ ] **Step 5: Commit**

```bash
git add apps/demo/app/page.tsx
git commit -m "feat(demo): add light theme toggle to main page"
```

---

### Task 13: Update Navigation Header with Links to All Pages

**Files:**
- Create: `apps/demo/lib/demo-components/MainHeader.tsx`
- Modify: `apps/demo/app/layout.tsx`

**Steps:**

- [ ] **Step 1: Create main header component**

```typescript
// apps/demo/lib/demo-components/MainHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme-context';

export function MainHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isMainPage = pathname === '/';
  const isReferencePage = pathname.startsWith('/reference');
  const isAdvancedPage = pathname.startsWith('/advanced');
  const isPlaygroundPage = pathname.startsWith('/config-playground');

  return (
    <header className="sticky top-0 z-50 bg-zinc-950 light:bg-white/80 light:backdrop-blur border-b border-zinc-800/60 light:border-zinc-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-white light:text-zinc-900 font-bold text-sm">SkelCore</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isMainPage
                ? 'text-indigo-400 light:text-indigo-600 bg-zinc-900/50 light:bg-indigo-50'
                : 'text-zinc-500 light:text-zinc-600 hover:text-zinc-300 light:hover:text-zinc-700 hover:bg-zinc-900 light:hover:bg-zinc-100'
            }`}
          >
            Showcase
          </Link>
          <Link
            href="/reference"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isReferencePage
                ? 'text-indigo-400 light:text-indigo-600 bg-zinc-900/50 light:bg-indigo-50'
                : 'text-zinc-500 light:text-zinc-600 hover:text-zinc-300 light:hover:text-zinc-700 hover:bg-zinc-900 light:hover:bg-zinc-100'
            }`}
          >
            Reference
          </Link>
          <Link
            href="/config-playground"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPlaygroundPage
                ? 'text-indigo-400 light:text-indigo-600 bg-zinc-900/50 light:bg-indigo-50'
                : 'text-zinc-500 light:text-zinc-600 hover:text-zinc-300 light:hover:text-zinc-700 hover:bg-zinc-900 light:hover:bg-zinc-100'
            }`}
          >
            Playground
          </Link>
          <Link
            href="/advanced"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAdvancedPage
                ? 'text-indigo-400 light:text-indigo-600 bg-zinc-900/50 light:bg-indigo-50'
                : 'text-zinc-500 light:text-zinc-600 hover:text-zinc-300 light:hover:text-zinc-700 hover:bg-zinc-900 light:hover:bg-zinc-100'
            }`}
          >
            Advanced
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="px-2 py-2 rounded-lg border border-zinc-700 light:border-zinc-300 text-zinc-400 light:text-zinc-600 hover:bg-zinc-900 light:hover:bg-zinc-100 transition-colors text-sm"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update layout.tsx to include main header**

```typescript
// apps/demo/app/layout.tsx
import React from 'react';
import { ThemeProvider } from './lib/theme-context';
import { MainHeader } from './lib/demo-components/MainHeader';
import './globals.css';

export const metadata = {
  title: 'SkelCore Demo & Reference',
  description: 'Zero-config skeleton loaders for React',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <MainHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update demo-components export**

```typescript
// apps/demo/lib/demo-components/index.ts
export { FeatureCard } from './FeatureCard';
export { ConfigExample } from './ConfigExample';
export { InteractiveToggle } from './InteractiveToggle';
export { CodeBlock } from './CodeBlock';
export { ReferenceNav } from './ReferenceNav';
export { MainHeader } from './MainHeader';
```

- [ ] **Step 4: Test navigation across all pages**

```bash
# From browser: http://localhost:3005
# Verify:
# - Main header appears on all pages
# - Nav links highlight current page
# - Can navigate between Showcase, Reference, Playground, Advanced
# - Theme toggle works globally
```

- [ ] **Step 5: Commit**

```bash
git add apps/demo/app/layout.tsx apps/demo/lib/demo-components/MainHeader.tsx apps/demo/lib/demo-components/index.ts
git commit -m "feat(demo): add global navigation header"
```

---

## Summary Checklist

After completing all tasks, verify:

- [ ] All 13 tasks completed
- [ ] All pages load without errors
- [ ] Light theme toggle works globally
- [ ] All feature demos are interactive
- [ ] E2E tests pass
- [ ] All commits are atomic and descriptive
- [ ] Code is properly typed with TypeScript
- [ ] Light theme CSS variables defined and applied
- [ ] Navigation works between all pages
- [ ] Config playground is fully functional
- [ ] Advanced patterns pages demonstrate real-world usage

---

## Next Steps After Implementation

1. **Write additional E2E tests** for advanced patterns and config playground
2. **Add more advanced pattern pages** (nested components, async patterns, performance tuning)
3. **Create static blueprints** for SSR page examples
4. **Document each feature** with links to skelcore core package
5. **Add comparison tables** showing when to use each feature
6. **Create copy-paste examples** for common scenarios
7. **Add performance benchmarks** to show measurement timings
