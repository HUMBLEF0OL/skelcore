import { parseManifest } from "@ghostframe/core";
import type { ManifestDiffResult, ManifestDiffThresholds } from "../types";

export function evaluateManifestDiff(input: {
  baseManifest: unknown;
  candidateManifest: unknown;
  thresholds: ManifestDiffThresholds;
}): ManifestDiffResult {
  const baseParsed = parseManifest(input.baseManifest);
  const candidateParsed = parseManifest(input.candidateManifest);

  const baseValid = baseParsed.success;
  const candidateValid = candidateParsed.success;

  const baseEntries = baseValid && baseParsed.manifest ? baseParsed.manifest.entries : {};
  const candidateEntries =
    candidateValid && candidateParsed.manifest ? candidateParsed.manifest.entries : {};

  const baseKeys = Object.keys(baseEntries).sort();
  const candidateKeys = Object.keys(candidateEntries).sort();

  const addedKeys = candidateKeys.filter((key) => !baseKeys.includes(key));
  const removedKeys = baseKeys.filter((key) => !candidateKeys.includes(key));

  const changedKeys = baseKeys
    .filter((key) => candidateKeys.includes(key))
    .filter((key) => {
      const baseEntry = baseEntries[key];
      const candidateEntry = candidateEntries[key];
      return (
        baseEntry.structuralHash !== candidateEntry.structuralHash ||
        baseEntry.styleFingerprint !== candidateEntry.styleFingerprint
      );
    })
    .sort();

  const maxChanged = input.thresholds.maxChangedKeys;
  const changeBudgetPass = maxChanged === undefined ? true : changedKeys.length <= maxChanged;

  const errors: string[] = [];

  if (!baseValid) {
    errors.push(`Base manifest invalid: ${baseParsed.error ?? "unknown error"}`);
  }

  if (!candidateValid) {
    errors.push(`Candidate manifest invalid: ${candidateParsed.error ?? "unknown error"}`);
  }

  if (!changeBudgetPass && maxChanged !== undefined) {
    errors.push(`Changed keys threshold failed: ${changedKeys.length} > ${maxChanged}`);
  }

  return {
    summary: {
      added: addedKeys.length,
      removed: removedKeys.length,
      changed: changedKeys.length,
    },
    addedKeys,
    removedKeys,
    changedKeys,
    gates: {
      baseValid,
      candidateValid,
      changeBudget: changeBudgetPass,
      overall: baseValid && candidateValid && changeBudgetPass,
    },
    errors,
  };
}
