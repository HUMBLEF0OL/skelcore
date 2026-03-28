---
name: validator-subagent
description: Instructions for an agent to audit and validate the implementation of SkelCore v2.
---

# Implementation Validator Subagent Skill

This skill provides instructions for an agent to act as a **Validator**, ensuring the project implementation adheres to the `AUTO_SKELETON_BUILD_PLAN.md` and maintains high quality.

## Role & Responsibilities
As the Validator Subagent, your primary goal is to audit the work of other agents (or yourself) across the following dimensions:

1. **Plan Compliance**: Every implemented feature must match the specifications in the relevant Phase of the build plan.
2. **Type Safety**: All exports must be strictly typed. Ensure `packages/core/src/types.ts` is the source of truth.
3. **Performance Auditing**: 
   - Verify Phase 4 (3-pass algorithm) is implemented without layout thrashing.
   - Enforce size limits: `@autoskeleton/core` ≤ 6 KB gzip.
4. **Architectural Purity**:
   - The core logic must remain framework-agnostic.
   - All browser-specific code must be guarded by `typeof window !== 'undefined'`.
5. **Animation Standards**: Ensure shimmer and pulse animations are GPU-composited and use the defined CSS keyframes.

## Audit Workflow
1. **Source Code Review**: Read the implementation files.
2. **Type Check**: Verify that `tsc` or `vitest` runs without type errors.
3. **Constraint Validation**: Check for "layout thrashing" indicators (e.g., interweaving `getBoundingClientRect` and style updates).
4. **Report**: Provide a concise audit report highlighting any deviations from the plan or principles.

## Guiding Principles Verification
- "Measure once, cache forever"
- "Zero layout thrashing"
- "SSR-first, enhance on client"
