// ─── Element Roles ────────────────────────────────────────────────────────────

export type SkeletonRole =
  | "text" // Paragraph, heading, inline text
  | "image" // <img>, background-image, <picture>
  | "avatar" // Circular image (border-radius >= 50%)
  | "icon" // <svg>, small square
  | "button" // <button>, role="button"
  | "input" // <input>, <textarea>, <select>
  | "video" // <video>
  | "canvas" // <canvas>
  | "badge" // Small pill text (e.g. tag, chip)
  | "custom" // User-provided slot via data-skeleton-slot
  | "skip"; // Too small, excluded from skeleton

// ─── Layout Props ─────────────────────────────────────────────────────────────

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
  // Others
  direction: string;
};

// ─── Text Meta ────────────────────────────────────────────────────────────────

export type TextMeta = {
  lines: number;
  lineHeight: number; // px
  lastLineWidthRatio: number; // 0–1, default 0.7
};

// ─── Include/Exclude Matcher Types ───────────────────────────────────────────

export type ElementMatcherNodeMeta = {
  tagName: string;
  ariaRole: string | null;
  classList: string[];
  dataAttributes: Record<string, string>;
  textContent: string;
  hasChildren: boolean;
  childCount: number;
  role?: SkeletonRole | "container" | "table-row" | "table-cell";
};

export type ElementMatcher = {
  selector?: string;
  role?: SkeletonRole | "container" | "table-row" | "table-cell";
  predicate?: (nodeMeta: ElementMatcherNodeMeta) => boolean;
};

// ─── Placeholder Strategy Types ──────────────────────────────────────────────

export type PlaceholderStrategy = "none" | "auto" | "schema" | "slots";

export type PlaceholderBlockRole = Exclude<SkeletonRole, "skip"> | "table-cell" | "container";

export type PlaceholderSchemaBlock = {
  role?: PlaceholderBlockRole;
  width: number;
  height: number;
  repeat?: number;
  slotKey?: string;
  borderRadius?: string | number;
};

export type PlaceholderSchema = {
  blocks: PlaceholderSchemaBlock[];
};

export type PlaceholderSlotFactory<TNode = unknown> = () => TNode;

export type PlaceholderSlots<TNode = unknown> = Record<string, PlaceholderSlotFactory<TNode>>;

// ─── SSR + Measurement Control Types ────────────────────────────────────────

export type BlueprintSource = "client" | "server" | "cache";

export type BlueprintInvalidationReason =
  | "missing-root"
  | "missing-structural-hash"
  | "version-mismatch"
  | "structural-hash-mismatch";

export type MeasurementPolicyMode = "eager" | "idle" | "viewport" | "manual";

export type MeasurementPolicy = {
  mode: MeasurementPolicyMode;
  budgetMs?: number;
};

export type BlueprintCachePolicy = {
  ttlMs?: number;
  version?: number;
};

// ─── Blueprint Node ───────────────────────────────────────────────────────────

export type BlueprintNode = {
  id: string;
  role: SkeletonRole | "container" | "table-row" | "table-cell";
  width: number; // px
  height: number; // px
  top: number; // px, relative to skeleton root
  left: number; // px, relative to skeleton root
  layout: Partial<LayoutProps>;
  text?: TextMeta;
  borderRadius: string; // CSS value
  aspectRatio?: string; // for images/video
  tagName: string;
  slotKey?: string; // populated when role === 'custom'
  children: BlueprintNode[];
  // Table support
  isTable?: boolean;
  isTableRow?: boolean;
  isTableCell?: boolean;
};

// ─── Blueprint ────────────────────────────────────────────────────────────────

export type Blueprint = {
  version: number; // bump on breaking schema change
  rootWidth: number;
  rootHeight: number;
  nodes: BlueprintNode[];
  // Optional to remain backward-compatible with existing serialized blueprints.
  structuralHash?: string;
  generatedAt: number; // Date.now()
  source: "static" | "dynamic"; // how it was generated
};

// ─── Animation & Config ───────────────────────────────────────────────────────

export type AnimationMode = "pulse" | "shimmer" | "none";

export type AnimationPreset = AnimationMode | (string & {});

export type SkeletonAnimationDefinition = {
  className?: string;
  inlineStyle?: Record<string, string | number>;
  keyframes?: string;
  durationMs?: number;
};

export type SkeletonConfig = {
  animation: AnimationMode;
  baseColor: string; // CSS color, default var(--skeleton-base)
  highlightColor: string; // shimmer highlight, default var(--skeleton-highlight)
  borderRadius: number; // px, default 4
  speed: number; // animation duration multiplier, default 1
  minTextHeight: number; // px, default 12
  maxDepth: number; // DOM traversal limit, default 12
  lastLineRatio: number; // last text line width, default 0.7
  iconMaxSize: number; // px, below which SVG = icon, default 32
  minImageArea: number; // px², below which not classified as image, default 900
  transitionDuration: number; // ms, content fade-in, default 300
  tableCellInsetX: number; // px horizontal inset for table-cell bars, default 8
  tableCellBarHeightRatio: number; // relative to cell height, default 0.45
  tableCellBarMinHeight: number; // px minimum table-cell bar height, default 6
  tableCellDefaultWidthRatio: number; // 0-1 fallback width ratio for table bars, default 0.7
};

export const DEFAULT_CONFIG: SkeletonConfig = {
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
};

// ─── Public React Component Props ─────────────────────────────────────────────
// Note: `React.ReactNode` cannot be imported here (framework-agnostic core).
// The react package re-exports this type with the React-specific generic applied.

export type GhostframePropsBase = {
  loading: boolean;
  config?: Partial<SkeletonConfig>;
  // A pre-computed blueprint from SSR — skip measurement if provided
  blueprint?: Blueprint;
  // A hydrated blueprint that can be validated before first use
  hydrateBlueprint?: Blueprint;
  // Blueprint origin used to decide whether validation is required
  blueprintSource?: BlueprintSource;
  // Called when a hydrated blueprint is rejected and measurement must resume
  onBlueprintInvalidated?: (reason: BlueprintInvalidationReason) => void;
  // Measurement scheduling policy for the analyzer path
  measurementPolicy?: MeasurementPolicy;
  // Cache validation controls for hydrated and cached blueprints
  blueprintCachePolicy?: BlueprintCachePolicy;
  // Opt-in to re-measure when container resizes
  remeasureOnResize?: boolean;
  // Optional include/exclude controls used by analyzers
  include?: ElementMatcher[];
  exclude?: ElementMatcher[];
  // Optional placeholder strategy controls
  placeholderStrategy?: PlaceholderStrategy;
  placeholderSchema?: PlaceholderSchema;
  placeholderSlots?: PlaceholderSlots;
  // Optional animation extensibility controls
  animationPreset?: AnimationPreset;
  animationRegistry?: Record<string, SkeletonAnimationDefinition>;
};

// ─── Measured Node (Role Inferencer Input) ─────────────────────────────────────

export type RelevantComputedStyles = {
  display: string;
  visibility: string;
  position: string;
  borderRadius: string;
  fontSize: string;
  lineHeight: string;
  backgroundImage: string;
  objectFit: string;
  overflow: string;
  width: string;
  height: string;
  aspectRatio: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
};

export type MeasuredNode = {
  tagName: string; // uppercase, e.g. 'IMG', 'BUTTON'
  ariaRole: string | null; // aria role attribute value
  classList: string[]; // css class names
  dataAttributes: Record<string, string>; // all data-* attributes
  computedStyles: RelevantComputedStyles;
  rect: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  hasChildren: boolean;
  childCount: number;
  textContent: string; // trimmed inner text
  // Intrinsic media dimensions (populated from HTMLImageElement.naturalWidth etc.)
  naturalWidth: number;
  naturalHeight: number;
  src: string; // src, href, or currentSrc
};

// ─── Rollout Telemetry ────────────────────────────────────────────────────────

export type RolloutEnvironment = "dev" | "staging" | "prod";

export type RolloutEventType =
  | "canary-validation"
  | "rollout-decision"
  | "rollback-triggered"
  | "strategy-selected"
  | "safety-gate-check"
  | "anomaly-detected";

export type RolloutDecision = "proceed" | "rollback" | "hold";

export interface DecisionProof {
  reason: string;
  passed: boolean;
  thresholdErrorRate?: number;
  observedErrorRate?: number;
  thresholdLatencyMs?: number;
  observedP99LatencyMs?: number;
}

export interface RolloutEvent {
  type: RolloutEventType;
  timestamp: number;
  environment: RolloutEnvironment;
  routeKey: string;
  requestId: string;
  policyVersion: number;
  decision?: RolloutDecision;
  decisionProof?: DecisionProof;
  rollbackTarget?: number;
  payload?: Record<string, unknown>;
}

export interface RolloutMetrics {
  totalEvents: number;
  eventsByType: Record<RolloutEventType, number>;
  decisionCounts: Record<RolloutDecision, number>;
  environmentMetrics: Record<RolloutEnvironment, RolloutMetricsPerEnv>;
}

export interface RolloutMetricsPerEnv {
  eventsObserved: number;
  proceededCount: number;
  rolledBackCount: number;
  heldCount: number;
  lastRollbackAt?: number;
}
