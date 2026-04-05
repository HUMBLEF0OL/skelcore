import { parseEntry, parseManifest } from "@ghostframe/core";
import type { ManifestQualityResult, ManifestQualityThresholds } from "../types";

export function evaluateManifestQuality(input: {
  manifestData: unknown;
  artifactSizeBytes: number;
  thresholds: ManifestQualityThresholds;
}): ManifestQualityResult {
  const requiredKeys = [...new Set(input.thresholds.requiredKeys)].sort();
  const entriesObject = toRecord(input.manifestData, "entries");
  const entryKeys = Object.keys(entriesObject).sort();

  const invalidEntryKeys: string[] = [];

  for (const key of entryKeys) {
    const parsedEntry = parseEntry(entriesObject[key]);
    if (!parsedEntry.valid) {
      invalidEntryKeys.push(key);
    }
  }

  const parseResult = parseManifest(input.manifestData);
  const schemaValid = parseResult.success;

  const totalRequiredKeys = requiredKeys.length;
  const presentRequiredKeys = requiredKeys.filter((key) => entryKeys.includes(key)).length;
  const coverageRatio =
    totalRequiredKeys === 0 ? 1 : presentRequiredKeys / Math.max(totalRequiredKeys, 1);

  const missingRequiredKeys = requiredKeys.filter((key) => !entryKeys.includes(key));

  const coveragePass = coverageRatio >= input.thresholds.minCoverage;
  const invalidEntriesPass = invalidEntryKeys.length <= input.thresholds.maxInvalidEntries;
  const artifactSizePass =
    input.thresholds.maxArtifactSizeBytes === undefined
      ? true
      : input.artifactSizeBytes <= input.thresholds.maxArtifactSizeBytes;
  const requiredKeysPass = missingRequiredKeys.length === 0;

  const errors: string[] = [];

  if (!schemaValid) {
    errors.push(`Schema validation failed: ${parseResult.error ?? "unknown error"}`);
  }

  if (!coveragePass) {
    errors.push(
      `Coverage threshold failed: ${coverageRatio.toFixed(3)} < ${input.thresholds.minCoverage.toFixed(3)}`
    );
  }

  if (!requiredKeysPass) {
    errors.push(`Missing required keys: ${missingRequiredKeys.join(", ")}`);
  }

  if (!invalidEntriesPass) {
    errors.push(
      `Invalid entries threshold failed: ${invalidEntryKeys.length} > ${input.thresholds.maxInvalidEntries}`
    );
  }

  if (!artifactSizePass && input.thresholds.maxArtifactSizeBytes !== undefined) {
    errors.push(
      `Artifact size threshold failed: ${input.artifactSizeBytes} > ${input.thresholds.maxArtifactSizeBytes} bytes`
    );
  }

  const overall =
    schemaValid && coveragePass && requiredKeysPass && invalidEntriesPass && artifactSizePass;

  return {
    summary: {
      entryCount: entryKeys.length,
      totalRequiredKeys,
      presentRequiredKeys,
      coverageRatio,
      invalidEntries: invalidEntryKeys.length,
      artifactSizeBytes: input.artifactSizeBytes,
    },
    gates: {
      schemaValid,
      coverage: coveragePass,
      requiredKeys: requiredKeysPass,
      invalidEntries: invalidEntriesPass,
      artifactSize: artifactSizePass,
      overall,
    },
    missingRequiredKeys,
    invalidEntryKeys,
    errors,
    parseError: parseResult.success ? undefined : parseResult.error,
  };
}

function toRecord(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = (value as Record<string, unknown>)[key];
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  return candidate as Record<string, unknown>;
}
