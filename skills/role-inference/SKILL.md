---
name: role-inference
description: Logic for classifying HTML elements based on their measurements, styles, and tags.
---

# Role Inference Engine Skill

This skill defines the rules for classifying an element into one of the `autoskeleton` roles.

## Skeleton Roles
- `text`, `image`, `avatar`, `icon`, `button`, `input`, `video`, `canvas`, `badge`, `custom`, `skip`.

## Classification Logic (Scoring System)

Elements are scored against candidate roles. The highest score above 30 wins.

### Core Scoring Rules
- **Skip**: Elements smaller than 10x10, height/width < 4px, or visibility:hidden/display:none.
- **Image**: `<img>`, `<picture>`, or `backgroundImage` (not gradient).
- **Avatar**: `<img>` with `borderRadius >= 50%` or circular shape.
- **Icon**: `<svg>` with dimensions ≤ 32px.
- **Button**: `<button>` or `role="button"` or `cursor: pointer`.
- **Text**: Elements with text content or specific tags (`P`, `SPAN`, `H1-H6`).

## Overrides
1. `data-skeleton-ignore` → `skip`
2. `data-skeleton-role="<role>"` → Force that role.
3. `data-skeleton-slot="<key>"` → `custom`

## Implementation Detail
The inferencer must be a pure function that takes a `MeasuredNode` and returns a `SkeletonRole`.
Avoid hardcoded chains; use the `SCORING_RULES` table for extensibility.
