export * from "./types";
export { inferRole } from "./role-inferencer";
export { generateStaticBlueprint, STATIC_DEFAULTS } from "./static-analyzer";
export type { VNode } from "./static-analyzer";
export { generateDynamicBlueprint } from "./dynamic-analyzer";
export { blueprintCache, computeStructuralHash, djb2 } from "./blueprint-cache";
export { animationSystem, AnimationSystem } from "./animation-system";
