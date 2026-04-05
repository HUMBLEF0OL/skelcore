export * from "./types.js";
export { inferRole } from "./role-inferencer.js";
export { generateStaticBlueprint, STATIC_DEFAULTS } from "./static-analyzer.js";
export type { VNode } from "./static-analyzer.js";
export { generateDynamicBlueprint } from "./dynamic-analyzer.js";
export { blueprintCache, computeStructuralHash, djb2 } from "./blueprint-cache.js";
export { animationSystem, AnimationSystem } from "./animation-system.js";

// Phase 2: Manifest types and validator
export {
  type BlueprintManifest,
  type ManifestEntry,
  type ManifestQuality,
  type ManifestBuildMetadata,
  type ManifestDefaults,
  type ManifestIndex,
  type ManifestParseResult,
  type ManifestEntryValidationResult,
  type ManifestAcceptanceResult,
  type StructuralHash,
  type StyleFingerprint,
  asStructuralHash,
  asStyleFingerprint,
} from "./manifest-types.js";

export {
  parseManifest,
  parseEntry,
  isEntryFresh,
  doesStructuralHashMatch,
  validateEntryAcceptance,
  acceptManifestEntry,
  lookupAndAcceptEntry,
} from "./manifest-validator.js";

// Phase 10: Rollout Telemetry Infrastructure
export { RolloutEventCollector, globalRolloutCollector } from "./rollout-telemetry.js";
