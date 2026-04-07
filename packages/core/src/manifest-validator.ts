import type {
  BlueprintManifest,
  ManifestEntry,
  ManifestParseResult,
  ManifestEntryValidationResult,
  ManifestAcceptanceResult,
  ManifestDefaults,
  ManifestIndex,
  ManifestQuality,
  StructuralHash,
  CompatibilityError,
  CompatibilityValidationResult,
  CompatibilityProfile,
} from "./manifest-types.js";
import type { Blueprint } from "./types.js";
import { asStructuralHash, asStyleFingerprint } from "./manifest-types.js";

/**
 * Parse and validate a JSON object as a BlueprintManifest.
 * Safe: never throws, always returns a result object.
 */
export function parseManifest(input: unknown): ManifestParseResult {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      error: "Input must be a non-null object",
    };
  }

  const obj = input as Record<string, unknown>;

  // Check required top-level fields
  if (typeof obj.manifestVersion !== "number") {
    return {
      success: false,
      error: "manifestVersion must be a number",
    };
  }

  if (obj.manifestVersion !== 1) {
    return {
      success: false,
      error: `Unsupported manifest version: ${obj.manifestVersion}. Expected 1.`,
    };
  }

  if (typeof obj.packageVersion !== "string") {
    return {
      success: false,
      error: "packageVersion must be a string",
    };
  }

  // Validate build metadata
  if (!obj.build || typeof obj.build !== "object") {
    return {
      success: false,
      error: "build metadata is required and must be an object",
    };
  }

  const buildMeta = obj.build as Record<string, unknown>;
  if (typeof buildMeta.builtAt !== "number") {
    return {
      success: false,
      error: "build.builtAt must be a number (epoch ms)",
    };
  }

  if (typeof buildMeta.appVersion !== "string") {
    return {
      success: false,
      error: "build.appVersion must be a string",
    };
  }

  // Validate defaults
  if (!obj.defaults || typeof obj.defaults !== "object") {
    return {
      success: false,
      error: "defaults is required and must be an object",
    };
  }

  const defaults = obj.defaults as Record<string, unknown>;
  if (typeof defaults.ttlMs !== "number" || defaults.ttlMs < 0) {
    return {
      success: false,
      error: "defaults.ttlMs must be a non-negative number (ms)",
    };
  }

  const parsedDefaults: ManifestDefaults = {
    ttlMs: defaults.ttlMs,
    strictStyleDrift:
      typeof defaults.strictStyleDrift === "number" ? defaults.strictStyleDrift : undefined,
  };

  // Validate entries object
  if (!obj.entries || typeof obj.entries !== "object") {
    return {
      success: false,
      error: "entries is required and must be an object",
    };
  }

  const entriesObj = obj.entries as Record<string, unknown>;
  const parsed: Record<string, ManifestEntry> = {};

  for (const [key, entryData] of Object.entries(entriesObj)) {
    const entryResult = parseEntry(entryData);
    if (!entryResult.valid) {
      return {
        success: false,
        error: `Invalid entry key "${key}": ${entryResult.reason}`,
        errorDetails: { entryKey: key, entryError: entryResult.reason },
      };
    }
    parsed[key] = entryResult.entry!;
  }

  const manifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: obj.packageVersion as string,
    build: {
      commitSha: buildMeta.commitSha as string | undefined,
      branch: buildMeta.branch as string | undefined,
      builtAt: buildMeta.builtAt as number,
      appVersion: buildMeta.appVersion as string,
    },
    defaults: parsedDefaults,
    entries: parsed,
    index: obj.index as ManifestIndex | undefined,
    signature: typeof obj.signature === "string" ? obj.signature : undefined,
  };

  return {
    success: true,
    manifest,
  };
}

/**
 * Parse a single manifest entry.
 * Safe: never throws.
 */
export function parseEntry(input: unknown): ManifestEntryValidationResult {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      reason: "Entry must be a non-null object",
    };
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.key !== "string") {
    return {
      valid: false,
      reason: "key must be a string",
    };
  }

  if (!obj.blueprint || typeof obj.blueprint !== "object") {
    return {
      valid: false,
      reason: "blueprint is required and must be an object",
    };
  }

  const bp = obj.blueprint as Record<string, unknown>;
  if (typeof bp.version !== "number" || bp.version !== 1) {
    return {
      valid: false,
      reason: "blueprint.version must be 1",
    };
  }

  if (typeof bp.rootWidth !== "number" || bp.rootWidth <= 0) {
    return {
      valid: false,
      reason: "blueprint.rootWidth must be a positive number",
    };
  }

  if (typeof bp.rootHeight !== "number" || bp.rootHeight <= 0) {
    return {
      valid: false,
      reason: "blueprint.rootHeight must be a positive number",
    };
  }

  if (!Array.isArray(bp.nodes)) {
    return {
      valid: false,
      reason: "blueprint.nodes must be an array",
    };
  }

  if (typeof obj.structuralHash !== "string") {
    return {
      valid: false,
      reason: "structuralHash must be a string",
    };
  }

  if (typeof obj.generatedAt !== "number") {
    return {
      valid: false,
      reason: "generatedAt must be a number (epoch ms)",
    };
  }

  if (typeof obj.ttlMs !== "number" || obj.ttlMs < 0) {
    return {
      valid: false,
      reason: "ttlMs must be a non-negative number (ms)",
    };
  }

  if (!obj.quality || typeof obj.quality !== "object") {
    return {
      valid: false,
      reason: "quality is required and must be an object",
    };
  }

  const quality = obj.quality as Record<string, unknown>;
  if (typeof quality.confidence !== "number" || quality.confidence < 0 || quality.confidence > 1) {
    return {
      valid: false,
      reason: "quality.confidence must be 0–1",
    };
  }

  if (!Array.isArray(quality.warnings)) {
    return {
      valid: false,
      reason: "quality.warnings must be an array",
    };
  }

  const parsedQuality: ManifestQuality = {
    confidence: quality.confidence,
    warnings: quality.warnings as string[],
  };

  const entry: ManifestEntry = {
    key: obj.key as string,
    blueprint: bp as Blueprint,
    structuralHash: asStructuralHash(obj.structuralHash as string),
    styleFingerprint:
      typeof obj.styleFingerprint === "string"
        ? asStyleFingerprint(obj.styleFingerprint)
        : undefined,
    generatedAt: obj.generatedAt as number,
    ttlMs: obj.ttlMs as number,
    quality: parsedQuality,
    viewport: obj.viewport as ManifestEntry["viewport"],
    locale: typeof obj.locale === "string" ? obj.locale : undefined,
    theme: typeof obj.theme === "string" ? obj.theme : undefined,
    density: typeof obj.density === "string" ? obj.density : undefined,
  };

  return {
    valid: true,
    entry,
  };
}

/**
 * Check if an entry is still in its TTL window.
 */
export function isEntryFresh(entry: ManifestEntry, now: number = Date.now()): boolean {
  return entry.generatedAt + entry.ttlMs >= now;
}

/**
 * Check if an entry's structural hash matches the current DOM.
 * @param entry Entry to validate
 * @param actualHash Current structural hash from DOM
 * @returns true if hashes match
 */
export function doesStructuralHashMatch(entry: ManifestEntry, actualHash: StructuralHash): boolean {
  return entry.structuralHash === actualHash;
}

/**
 * Validate a manifest entry against all acceptance gates.
 * Returns the reasons an entry was rejected if not accepted.
 */
export function validateEntryAcceptance(
  entry: ManifestEntry,
  {
    manifestVersion = 1,
    actualStructuralHash,
    now = Date.now(),
    strictStyleDrift = false,
    styleDriftThreshold = 0,
  }: {
    manifestVersion?: number;
    actualStructuralHash?: StructuralHash;
    now?: number;
    strictStyleDrift?: boolean;
    styleDriftThreshold?: number;
  } = {}
): ManifestEntryValidationResult {
  // Version gate
  if (entry.blueprint.version !== manifestVersion) {
    return {
      valid: false,
      entry,
      reason: `Blueprint version ${entry.blueprint.version} does not match expected version ${manifestVersion}`,
      invalidationReason: "version-mismatch",
    };
  }

  // TTL gate
  if (!isEntryFresh(entry, now)) {
    const staleMs = now - (entry.generatedAt + entry.ttlMs);
    return {
      valid: false,
      entry,
      reason: `Entry is stale by ${staleMs}ms (TTL: ${entry.ttlMs}ms)`,
      invalidationReason: "ttl-expired",
    };
  }

  // Structural hash gate (if current hash is available)
  if (actualStructuralHash && !doesStructuralHashMatch(entry, actualStructuralHash)) {
    return {
      valid: false,
      entry,
      reason: `Structural hash mismatch. Expected: ${actualStructuralHash}, got: ${entry.structuralHash}`,
      invalidationReason: "structural-hash-mismatch",
    };
  }

  // Style drift gate (if fingerprints are available and strict mode is enabled)
  if (strictStyleDrift && entry.styleFingerprint && styleDriftThreshold > 0) {
    // This will be implemented in Phase 4 when we have style fingerprinting
    // For now, just note the check was skipped
    if (entry.quality.warnings.includes("style-drift-detected")) {
      return {
        valid: false,
        entry,
        reason: "Entry has style drift warning and strict mode is enabled",
        invalidationReason: "style-drift",
      };
    }
  }

  return {
    valid: true,
    entry,
  };
}

/**
 * Accept a manifest entry for use in skeleton rendering.
 * Wraps validation with policy context.
 */
export function acceptManifestEntry(
  entry: ManifestEntry,
  options: Parameters<typeof validateEntryAcceptance>[1] = {}
): ManifestAcceptanceResult {
  const validation = validateEntryAcceptance(entry, options);
  if (!validation.valid) {
    return {
      accepted: false,
      reason: validation.reason || "Unknown validation error",
    };
  }
  return {
    accepted: true,
    entry: validation.entry,
    reason: "manifest-entry-valid",
  };
}

/**
 * Quick lookup and acceptance of an entry from a manifest by key.
 * Combines parsing, lookup, and validation in one step.
 */
export function lookupAndAcceptEntry(
  manifest: BlueprintManifest,
  key: string,
  options: Parameters<typeof validateEntryAcceptance>[1] = {}
): ManifestAcceptanceResult {
  const entry = manifest.entries[key];
  if (!entry) {
    return {
      accepted: false,
      reason: `Entry key "${key}" not found in manifest`,
    };
  }

  return acceptManifestEntry(entry, {
    manifestVersion: manifest.manifestVersion,
    ...options,
  });
}

/**
 * B4: Validate manifest compatibility with current runtime contract.
 * Checks version, schema, and (optionally) policy constraints.
 * Returns machine-parseable validation result with actionable error codes.
 */
export function validateManifestCompatibility(
  manifest: BlueprintManifest,
  profile?: CompatibilityProfile
): CompatibilityValidationResult {
  const errors: CompatibilityError[] = [];
  const entryErrors: CompatibilityValidationResult["entryErrors"] = [];

  // 1. Manifest version gate
  if (manifest.manifestVersion !== 1) {
    errors.push({
      code: "unsupported-manifest-version",
      message: `Manifest version ${manifest.manifestVersion} is not supported. Expected version 1.`,
      field: "manifestVersion",
      expected: 1,
      actual: manifest.manifestVersion,
    });
  }

  // 2. Required fields check
  const requiredFields = profile?.requiredFields || ["entries", "build", "defaults"];
  for (const field of requiredFields) {
    if (!(field in manifest) || (manifest as Record<string, unknown>)[field] === undefined) {
      errors.push({
        code: "missing-required-field",
        message: `Required field "${field}" is missing or undefined.`,
        field,
      });
    }
  }

  // 3. Package version check (if profile specifies minimum version)
  if (profile?.minimumPackageVersion) {
    if (!isVersionGreaterOrEqual(manifest.packageVersion, profile.minimumPackageVersion)) {
      errors.push({
        code: "package-version-too-old",
        message: `Package version ${manifest.packageVersion} is below minimum required ${profile.minimumPackageVersion}.`,
        field: "packageVersion",
        expected: `>= ${profile.minimumPackageVersion}`,
        actual: manifest.packageVersion,
      });
    }
  }

  // 4. Policy constraints (if specified)
  if (profile?.allowedPolicies) {
    const policyConstraints = (manifest as any).policyConstraints?.policy ||
      (manifest as any).policyConstraints?.mode || [
        manifest.build,
      ];
    const policies = Array.isArray(policyConstraints) ? policyConstraints : [policyConstraints];

    for (const policy of policies) {
      if (policy && !profile.allowedPolicies.includes(policy)) {
        errors.push({
          code: "disallowed-policy-mode",
          message: `Policy mode "${policy}" is not allowed. Allowed modes: ${profile.allowedPolicies.join(", ")}.`,
          field: "policyConstraints",
          expected: profile.allowedPolicies,
          actual: policy,
        });
      }
    }
  }

  // 5. Validate individual entries
  for (const [key, entry] of Object.entries(manifest.entries)) {
    const entryValidationErrors: CompatibilityError[] = [];

    // Blueprint version check
    if (entry.blueprint.version !== 1) {
      entryValidationErrors.push({
        code: "blueprint-version-incompatible",
        message: `Entry "${key}" has blueprint version ${entry.blueprint.version}, expected 1.`,
        field: `entries[${key}].blueprint.version`,
        expected: 1,
        actual: entry.blueprint.version,
      });
    }

    // Quality confidence check (warn if too low)
    if (entry.quality.confidence < 0.5) {
      entryValidationErrors.push({
        code: "low-quality-confidence",
        message: `Entry "${key}" has low quality confidence (${entry.quality.confidence}). Consider re-capturing.`,
        field: `entries[${key}].quality.confidence`,
        expected: ">= 0.5",
        actual: entry.quality.confidence,
      });
    }

    if (entryValidationErrors.length > 0) {
      entryErrors.push({
        key,
        errors: entryValidationErrors,
      });
    }
  }

  // 6. Custom profile validation
  if (profile?.validate) {
    const customErrors = profile.validate(manifest);
    errors.push(...customErrors);
  }

  // Merge entry errors into main error list if there are any
  if (entryErrors.length > 0) {
    // Only fail overall if there are critical entry errors
    const criticalEntryErrors = entryErrors.filter((e) =>
      e.errors.some((err) => !err.code.includes("low-quality"))
    );
    if (criticalEntryErrors.length > 0) {
      errors.push({
        code: "entry-validation-failed",
        message: `${criticalEntryErrors.length} entry/entries failed validation.`,
      });
    }
  }

  return {
    compatible: errors.length === 0,
    errors,
    entryErrors: entryErrors.length > 0 ? entryErrors : undefined,
  };
}

/**
 * B4: Validate a manifest against a compatibility matrix of supported versions.
 * Checks that manifest was created by a supported version of the package.
 */
export function validateCompatibilityMatrix(
  manifest: BlueprintManifest,
  options: {
    supportedVersions: string[];
    allowedModes?: string[];
  } = { supportedVersions: [] }
): CompatibilityValidationResult {
  const errors: CompatibilityError[] = [];

  // Check if package version is in supported list
  if (!options.supportedVersions.includes(manifest.packageVersion)) {
    errors.push({
      code: "unsupported-package-version",
      message: `Package version "${manifest.packageVersion}" is not in the supported versions list: ${options.supportedVersions.join(", ")}.`,
      field: "packageVersion",
      expected: options.supportedVersions,
      actual: manifest.packageVersion,
    });
  }

  // If allowed modes are specified, check compatibility
  if (options.allowedModes && (manifest as any).policyConstraints?.mode) {
    const mode = (manifest as any).policyConstraints.mode;
    if (!options.allowedModes.includes(mode)) {
      errors.push({
        code: "policy-mode-not-allowed",
        message: `Policy mode "${mode}" is not allowed for current runtime. Allowed: ${options.allowedModes.join(", ")}.`,
        field: "policyConstraints.mode",
        expected: options.allowedModes,
        actual: mode,
      });
    }
  }

  return {
    compatible: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Compare semantic versions (e.g., "1.2.3" >= "1.0.0")
 */
function isVersionGreaterOrEqual(actual: string, minimum: string): boolean {
  const actualParts = actual.split(".").map(Number);
  const minimumParts = minimum.split(".").map(Number);

  for (let i = 0; i < Math.max(actualParts.length, minimumParts.length); i++) {
    const a = actualParts[i] || 0;
    const b = minimumParts[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true; // equal
}
