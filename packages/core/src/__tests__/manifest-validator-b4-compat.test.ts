import { describe, it, expect } from "vitest";
import type { BlueprintManifest, CompatibilityProfile } from "../manifest-types.js";
import type { BlueprintNode } from "../types.js";
import {
    validateManifestCompatibility,
    validateCompatibilityMatrix,
} from "../manifest-validator.js";
import { asStructuralHash } from "../manifest-types.js";

const createNode = (id: string, tagName = "div", children: BlueprintNode[] = []): BlueprintNode => ({
    id,
    role: "container",
    width: 100,
    height: 20,
    top: 0,
    left: 0,
    layout: {},
    borderRadius: "4px",
    tagName,
    children,
});

describe("B4: Manifest Compatibility Validator", () => {
    const createManifest = (version: number, packageVersion: string): BlueprintManifest => {
        return {
            manifestVersion: version,
            packageVersion,
            build: {
                builtAt: Date.now(),
                appVersion: "1.0.0",
            },
            defaults: {
                ttlMs: 86400000,
            },
            entries: {
                SampleComponent: {
                    key: "SampleComponent",
                    blueprint: {
                        version: 1,
                        rootWidth: 300,
                        rootHeight: 200,
                        nodes: [createNode("n1", "div")],
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    structuralHash: asStructuralHash("hash-123"),
                    generatedAt: Date.now(),
                    ttlMs: 86400000,
                    quality: {
                        confidence: 0.95,
                        warnings: [],
                    },
                },
            },
        };
    };

    describe("validateManifestCompatibility", () => {
        it("accepts manifest v1 with current package version", () => {
            const manifest = createManifest(1, "0.1.0");

            const result = validateManifestCompatibility(manifest);
            expect(result.compatible).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("rejects manifest with unsupported version", () => {
            const manifest = createManifest(99, "0.1.0");

            const result = validateManifestCompatibility(manifest);
            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: "unsupported-manifest-version",
                })
            );
        });

        it("validates required fields in manifest structure", () => {
            const manifest = createManifest(1, "0.1.0");
            const incomplete = { ...manifest, build: undefined as any };

            const result = validateManifestCompatibility(incomplete);
            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: expect.stringMatching(/missing|required/),
                })
            );
        });

        it("validates entries conform to compatibility schema", () => {
            const manifest = createManifest(1, "0.1.0");
            manifest.entries.BadEntry = {
                key: "BadEntry",
                blueprint: {
                    version: 99,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                structuralHash: asStructuralHash("hash-bad"),
                generatedAt: Date.now(),
                ttlMs: 86400000,
                quality: {
                    confidence: 0.5,
                    warnings: [],
                },
            };

            const result = validateManifestCompatibility(manifest);
            expect(result.compatible).toBe(false);
            expect(result.entryErrors).toContainEqual(
                expect.objectContaining({
                    key: "BadEntry",
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            code: expect.stringMatching(/blueprint-version|incompatible/),
                        }),
                    ]),
                })
            );
        });

        it("returns machine-parseable error codes", () => {
            const manifest = createManifest(99, "0.1.0");

            const result = validateManifestCompatibility(manifest);
            expect(result.errors[0]).toHaveProperty("code");
            expect(typeof result.errors[0].code).toBe("string");
            expect(result.errors[0].code).toMatch(/^[a-z-]+$/);
        });

        it("provides actionable remediation text in errors", () => {
            const manifest = createManifest(99, "0.1.0");

            const result = validateManifestCompatibility(manifest);
            expect(result.errors[0]).toHaveProperty("message");
            expect(result.errors[0].message).toMatch(/accept|support|require/i);
        });
    });

    describe("validateCompatibilityMatrix", () => {
        it("validates backward compatibility for v1.0.0 manifests against current runtime", () => {
            const manifest = createManifest(1, "1.0.0");

            const result = validateCompatibilityMatrix(manifest, {
                supportedVersions: ["0.1.0", "1.0.0", "2.0.0"],
            });

            expect(result.compatible).toBe(true);
        });

        it("accepts manifests from supported package versions", () => {
            const manifest = createManifest(1, "1.5.0");

            const result = validateCompatibilityMatrix(manifest, {
                supportedVersions: ["1.0.0", "1.5.0", "2.0.0"],
            });

            expect(result.compatible).toBe(true);
        });

        it("rejects manifests from unsupported package versions", () => {
            const manifest = createManifest(1, "0.0.1");

            const result = validateCompatibilityMatrix(manifest, {
                supportedVersions: ["1.0.0", "2.0.0"],
            });

            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: "unsupported-package-version",
                })
            );
        });

        it("validates policy constraint compatibility", () => {
            const manifest = createManifest(1, "1.0.0");
            (manifest as any).policyConstraints = {
                mode: "invalid-mode",
            };

            const result = validateCompatibilityMatrix(manifest, {
                supportedVersions: ["1.0.0"],
                allowedModes: ["runtime-only", "shadow", "hybrid"],
            });

            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: expect.stringMatching(/policy|mode/),
                })
            );
        });

        it("achieves 100% pass rate for supported manifest variants", () => {
            const variants = [
                createManifest(1, "1.0.0"),
                createManifest(1, "1.1.0"),
                createManifest(1, "1.5.0"),
            ];

            const results = variants.map((v) =>
                validateCompatibilityMatrix(v, {
                    supportedVersions: ["1.0.0", "1.1.0", "1.5.0"],
                })
            );

            const passRate = results.filter((r) => r.compatible).length / results.length;
            expect(passRate).toBe(1.0);
        });
    });

    describe("compatibility profile definition", () => {
        it("enforces version gating for strict mode", () => {
            const manifest = createManifest(1, "0.5.0");
            const profileForStrictMode: CompatibilityProfile = {
                minimumPackageVersion: "1.0.0",
                manifestVersion: 1,
                requiredFields: ["entries", "build"],
                allowedPolicies: ["hybrid", "strict-precomputed"],
            };

            const result = validateManifestCompatibility(manifest, profileForStrictMode);
            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: "package-version-too-old",
                })
            );
        });

        it("rejects manifests with incompatible policy constraints for strict mode", () => {
            const manifest = createManifest(1, "1.0.0");
            (manifest as any).policyConstraints = {
                policy: "runtime-only",
            };

            const profileForStrictMode: CompatibilityProfile = {
                minimumPackageVersion: "1.0.0",
                manifestVersion: 1,
                requiredFields: ["entries", "build"],
                allowedPolicies: ["hybrid", "strict-precomputed"],
            };

            const result = validateManifestCompatibility(manifest, profileForStrictMode);
            expect(result.compatible).toBe(false);
        });
    });

    describe("error taxonomy", () => {
        it("categorizes version mismatch error code", () => {
            const result = validateManifestCompatibility(createManifest(99, "1.0.0"));
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: "unsupported-manifest-version",
                })
            );
        });
    });

    describe("B4 Version Upgrade Scenarios and Stress Tests", () => {
        it("validates version upgrade path: 0.1.0 to 1.0.0", () => {
            const oldManifest = createManifest(1, "0.1.0");
            const result = validateCompatibilityMatrix(oldManifest, {
                supportedVersions: ["0.1.0", "1.0.0"],
            });

            expect(result.compatible).toBe(true);
        });

        it("validates version upgrade path: 1.0.0 to 2.0.0", () => {
            const midManifest = createManifest(1, "1.0.0");
            const result = validateCompatibilityMatrix(midManifest, {
                supportedVersions: ["0.1.0", "1.0.0", "2.0.0"],
            });

            expect(result.compatible).toBe(true);
        });

        it("accepts supported minor version variants", () => {
            const versions = ["1.0.0", "1.1.0", "1.2.0", "1.5.0", "1.9.9"];

            const results = versions.map((v) =>
                validateCompatibilityMatrix(createManifest(1, v), {
                    supportedVersions: versions,
                })
            );

            expect(results.every((r) => r.compatible)).toBe(true);
        });

        it("rejects future version when runtime matrix does not support it", () => {
            const futureManifest = createManifest(1, "2.0.0");
            const result = validateCompatibilityMatrix(futureManifest, {
                supportedVersions: ["0.1.0", "1.0.0", "1.5.0"],
            });

            expect(result.compatible).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    code: expect.stringMatching(/unsupported|version/),
                })
            );
        });

        it("handles stress test with 1000+ entries", () => {
            const largeManifest = createManifest(1, "1.0.0");

            for (let i = 0; i < 1000; i++) {
                largeManifest.entries[`Component${i}`] = {
                    key: `Component${i}`,
                    blueprint: {
                        version: 1,
                        rootWidth: 300 + (i % 5) * 50,
                        rootHeight: 200 + (i % 5) * 30,
                        nodes: Array.from({ length: (i % 20) + 1 }, (_, n) =>
                            createNode(`n${n}`, n % 3 === 0 ? "div" : n % 3 === 1 ? "span" : "section")
                        ),
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    structuralHash: asStructuralHash(`hash-${i}`),
                    generatedAt: Date.now(),
                    ttlMs: 86400000,
                    quality: {
                        confidence: 0.8 + (i % 20) * 0.01,
                        warnings: [],
                    },
                };
            }

            const result = validateManifestCompatibility(largeManifest);
            expect(result.compatible).toBe(true);
            expect(result.entryErrors ?? []).toHaveLength(0);
        });

        it("validates backward compatibility with minimum package profile", () => {
            const oldStyleManifest = createManifest(1, "0.1.0");

            const result = validateManifestCompatibility(oldStyleManifest, {
                minimumPackageVersion: "0.1.0",
                manifestVersion: 1,
                requiredFields: ["entries", "build"],
            });

            expect(result.compatible).toBe(true);
        });

        it("enforces 100% pass rate for supported version matrix", () => {
            const supportedVersions = ["0.1.0", "0.2.0", "0.5.0", "1.0.0", "1.1.0", "1.5.0"];
            const manifests = supportedVersions.map((v) => createManifest(1, v));

            const results = manifests.map((m) =>
                validateCompatibilityMatrix(m, { supportedVersions })
            );

            const passRate = results.filter((r) => r.compatible).length / results.length;
            expect(passRate).toBe(1.0);
        });
    });
});
