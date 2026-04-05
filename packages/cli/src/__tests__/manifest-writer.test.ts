import { describe, expect, it } from "vitest";
import { parseManifest } from "@ghostframe/core";
import { buildManifestDocument, renderManifestJson } from "../emit/manifest-writer";

describe("buildManifestDocument", () => {
  it("produces manifest v1 accepted by parseManifest", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const parsed = parseManifest(manifest);
    expect(parsed.success).toBe(true);
  });

  it("renders compact JSON when prettyPrint is false", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const text = renderManifestJson(manifest, { prettyPrint: false });
    expect(text).not.toContain('\n  "');
  });

  it("renders pretty JSON by default", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const text = renderManifestJson(manifest);
    expect(text).toContain('\n  "');
  });
});
