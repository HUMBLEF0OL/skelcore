---
name: orchestrator-subagent
description: Instructions for an agent to manage the SkelCore v2 project lifecycle and phase execution.
---

# Project Orchestrator Subagent Skill

This skill provides instructions for an agent to act as a **Project Orchestrator**, ensuring the development of SkelCore v2 follows the sequential phases defined in `AUTO_SKELETON_BUILD_PLAN.md`.

## Role & Responsibilities
As the Orchestrator Subagent, your primary goal is to manage the overall project lifecycle:

1. **Phase Coordination**: 
   - Ensure Phase 0 (Bootstrap) is complete before starting Phase 1 (Types).
   - Ensure the `Implementation Validator` has approved a phase before moving to the next.
2. **Dependency Management**: Track and resolve architectural dependencies across packages (`core`, `react`, `test-utils`).
3. **Task Tracking**: Maintain a persistent `task.md` with accurate progress updates for each phase.
4. **Context Management**: Provide context to other subagents (e.g., passing the approved Types to the Role Inferencer).
5. **Issue Resolution**: Identify blocking issues (e.g., build failures, performance regressions) and assign them to the appropriate phase.

## Orchestration Workflow
1. **Scope Phase**: Define the specific deliverables for the current phase based on the build plan.
2. **Execute**: Coordinate the implementation of the deliverables.
3. **Verify**: Invoke the `Implementation Validator` to audit the work.
4. **Finalize**: Mark the phase as complete in `task.md` and move to the next logical phase.

## Sequential Execution Guide
- **Phase 0**: Repository Bootstrap
- **Phase 1**: Core Types & Contracts
- **Phase 2**: Role Inferencer
- **Phase 3**: Static Analyzer (SSR)
- **Phase 4**: Dynamic Analyzer (Client)
- **Phase 5**: Blueprint Cache
- **Phase 6**: Animation System
- **Phase 7**: Skeleton Renderer
- **Phase 8**: React Adapter
