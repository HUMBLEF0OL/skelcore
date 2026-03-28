---
name: dom-analyzer
description: High-performance DOM measurement strategy to avoid layout thrashing.
---

# Efficiency-First DOM Analyzer Skill

This skill implements the three-pass algorithm for generating an `autoskeleton` blueprint from a live DOM tree without causing layout thrashing.

## The Three-Pass Algorithm

### Pass 1: COLLECT (Pure Traversal)
- Walk the DOM tree recursively.
- Apply opt-out rules (`data-skeleton-ignore`, `display:none` via attribute check).
- Build a flat list of `MeasuredNode` candidates.
- Respect `maxDepth` (default 12).

### Pass 2: READ (Batch Measurements)
- Iterate the flat list from Pass 1.
- Perform all `getBoundingClientRect()` calls.
- Perform all `getComputedStyle()` calls.
- **CRITICAL**: Do NOT modify the DOM or read properties that trigger layout (like `offsetHeight`) during this loop.

### Pass 3: PROCESS (Pure Logic)
- Iterate measured data.
- Run the `Role Inference Engine` on each node.
- Compute positions relative to the root element.
- Detect multi-line text and table structures.
- Return the final `Blueprint`.

## Timing Strategy
Trigger measurement only after the browser is ready:
1. `await document.fonts.ready`
2. `await requestAnimationFrame` (x2 for reliable cross-browser layout)

## Performance Guidelines
- Avoid `querySelectorAll` in loops.
- Use `WeakMap` for caching blueprints to prevent memory leaks.
