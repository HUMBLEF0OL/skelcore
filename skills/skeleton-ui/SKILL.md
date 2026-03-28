---
name: skeleton-ui
description: Premium CSS-driven animations and blueprint rendering logic.
---

# Premium Skeleton UI Skill

This skill defines the visual language and rendering strategy for the `autoskeleton` project, focusing on GPU-composited animations and accurate blueprint-to-React mapping.

## Animation System: CSS-First

Use a single, shared CSS keyframe for shimmer and pulse effects to minimize JS overhead.

### Keyframes
- **Shimmer**: Animates `background-position` on a 200% linear gradient.
- **Pulse**: Animates `opacity` between 0.5 and 1.0.

### Attributes
- Use `data-animation="shimmer"` or `data-animation="pulse"` on skeleton blocks.
- Set `--skeleton-speed`, `--skeleton-base`, and `--skeleton-highlight` as CSS variables.

## Skeleton Renderer: React Implementation

Convert a `Blueprint` into React elements using the following rules:

1. **Mapping Roles to Elements**:
   - `text` with `lines > 1` → multiple `<span>` bars.
   - `image`/`avatar`/`video` → single block with border-radius.
   - `icon` → square block (tight border-radius).
2. **Positioning Strategy**:
   - **Absolute**: Use `top`, `left`, `width`, `height` from the blueprint.
   - **Flow**: Use parent layout styles from the blueprint for structural containers.
3. **Table Handling**: Preserve `<table>`, `<tr>`, and `<td>` tags while skeletonizing content.

## Style Injection
Inject the base CSS exactly once via a module-level singleton or export `SKELETON_CSS` for SSR inclusion in the `<head>`.

## Quality Check
- Ensure zero "layout thrashing" during rendering.
- Verify smooth transitions (e.g., `300ms` fade-in).
- All skeleton blocks should be `GPU-composited` via `will-change`.
