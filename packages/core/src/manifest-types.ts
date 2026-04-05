import type { Blueprint } from "./types.js";

/**
 * Structural hash of the DOM tree at capture time.
 * Changes when elements are added/removed, not when content changes.
 * Used for invalidation and cache busting.
 */
export type StructuralHash = string & { readonly __brand: "StructuralHash" };

export function asStructuralHash(value: string): StructuralHash {
  return value as StructuralHash;
}

/**
 * Style fingerprint for detecting style-based drift.
 * Optional; only computed if strict style drift detection is enabled.
 * Includes snapshot of key CSS properties at capture time.
 */
export type StyleFingerprint = string & { readonly __brand: "StyleFingerprint" };

export function asStyleFingerprint(value: string): StyleFingerprint {
  return value as StyleFingerprint;
}

/**
 * Build metadata captured at manifest generation time.
 */
export interface ManifestBuildMetadata {
  /** Git commit SHA of the build (optional for local development) */
  commitSha?: string;
  /** Git branch of the build (optional for local development) */
  branch?: string;
  /** Timestamp when manifest was generated */
  builtAt: number;
  /** Application version or build identifier */
  appVersion: string;
}

/**
 * Quality metrics for a manifest entry.
 */
export interface ManifestQuality {
  /** Confidence score 0–1 indicating capture reliability */
  confidence: number;
  /** Array of warnings encountered during capture (e.g. "font-not-loaded", "responsive-detected") */
  warnings: string[];
}

/**
 * Single skeleton blueprint entry in the manifest.
 * Keyed by component identifier (usually DISPLAYNAME or ghostframe key prop).
 */
export interface ManifestEntry {
  /** Canonical identifier for this entry (matches skeletonKey prop at runtime) */
  key: string;
  /** Serialized Blueprint from capture time */
  blueprint: Blueprint;
  /** Structural hash for cache validation */
  structuralHash: StructuralHash;
  /** Optional style fingerprint for strict drift detection */
  styleFingerprint?: StyleFingerprint;
  /** Timestamp when this entry was captured */
  generatedAt: number;
  /** TTL in milliseconds; entry is stale if generatedAt + ttlMs < now */
  ttlMs: number;
  /** Quality metrics from capture */
  quality: ManifestQuality;
  /** Optional viewport or breakpoint identifier (for responsive variants) */
  viewport?: number | string;
  /** Optional locale identifier for i18n variants */
  locale?: string;
  /** Optional theme identifier for theme variants */
  theme?: string;
  /** Optional density or scale variant */
  density?: string;
}

/**
 * Manifest version and defaults that apply to all entries.
 */
export interface ManifestDefaults {
  /** Default TTL in milliseconds if entry does not override */
  ttlMs: number;
  /** Optional style drift threshold 0–1 for strict mode */
  strictStyleDrift?: number;
}

/**
 * Index accelerators for fast lookup (optional, computed at build time).
 */
export interface ManifestIndex {
  /** Map of key → array of variant signatures for quick filtering */
  byKey: Record<string, string[]>;
  /** Map of viewport → array of keys to aid responsive routing */
  byViewport?: Record<string, string[]>;
}

/**
 * Top-level manifest document (v1).
 * Contains all precomputed blueprints and metadata.
 * Designed for JSON serialization and cache storage.
 */
export interface BlueprintManifest {
  /** Manifest schema version (current: 1) */
  manifestVersion: number;
  /** Ghostframe package version that generated this manifest */
  packageVersion: string;
  /** Build metadata */
  build: ManifestBuildMetadata;
  /** Top-level defaults */
  defaults: ManifestDefaults;
  /** All manifest entries, keyed by component identifier */
  entries: Record<string, ManifestEntry>;
  /** Optional lookup index for performance */
  index?: ManifestIndex;
  /** Optional integrity signature (reserved for future use) */
  signature?: string;
}

/**
 * Result of parsing a manifest from JSON.
 */
export interface ManifestParseResult {
  success: boolean;
  manifest?: BlueprintManifest;
  error?: string;
  errorDetails?: Record<string, unknown>;
}

/**
 * Validation gate result for a single entry.
 */
export interface ManifestEntryValidationResult {
  valid: boolean;
  entry?: ManifestEntry;
  reason?: string;
  invalidationReason?:
    | "version-mismatch"
    | "ttl-expired"
    | "structural-hash-mismatch"
    | "style-drift"
    | "malformed";
}

/**
 * Acceptance result when deciding whether to use a manifest source.
 */
export interface ManifestAcceptanceResult {
  accepted: boolean;
  entry?: ManifestEntry;
  reason: string;
}
