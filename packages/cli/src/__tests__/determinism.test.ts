import { describe, it, expect } from "vitest";
import { normalizeManifest, normalizeManifestEntry, canonicalizeNumber, classifyManifestDiffs } from "../capture/normalization";
import type { BlueprintManifest, BlueprintNode } from "@ghostframes/core";
import { asStructuralHash } from "@ghostframes/core";

// Helper to create minimal valid BlueprintNode for testing
function createTestNode(id: string, overrides?: Partial<BlueprintNode>): BlueprintNode {
    return {
        id,
        role: "text",
        width: 100,
        height: 20,
        top: 0,
        left: 0,
        layout: {},
        borderRadius: "0",
        tagName: "div",
        children: [],
        ...overrides,
    };
}

describe("determinism", () => {
    describe("B2: Deterministic Normalization", () => {
        it("should normalize entry by zeroing generatedAt", () => {
            const entry = {
                key: "test",
                blueprint: {
                    version: 1,
                    rootWidth: 100,
                    rootHeight: 40,
                    nodes: [],
                    generatedAt: 12345,
                    source: "dynamic" as const,
                },
                structuralHash: asStructuralHash("hash-1"),
                generatedAt: 99999,
                ttlMs: 60000,
                quality: { confidence: 0.9, warnings: ["warning-b", "warning-a"] },
            };

            const normalized = normalizeManifestEntry(entry);

            expect(normalized.generatedAt).toBe(0);
            expect(normalized.blueprint.generatedAt).toBe(0);
            expect(normalized.quality.warnings).toEqual(["warning-a", "warning-b"]); // sorted
        });

        it("should canonicalize numeric values to 3 decimals", () => {
            expect(canonicalizeNumber(1.23456)).toBe(1.235);
            expect(canonicalizeNumber(100)).toBe(100);
            expect(canonicalizeNumber(0.0001)).toBe(0);
            expect(canonicalizeNumber(-50.5678)).toBe(-50.568);
        });

        it("should normalize manifest by sorting entries and zeroing timestamps", () => {
            const manifest: BlueprintManifest = {
                manifestVersion: 1,
                packageVersion: "0.1.0",
                build: {
                    builtAt: 9999999,
                    appVersion: "test",
                },
                defaults: {
                    ttlMs: 60000,
                },
                entries: {
                    z_component: {
                        key: "z_component",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 12345,
                            source: "dynamic" as const,
                        },
                        structuralHash: asStructuralHash("hash-z"),
                        generatedAt: 12345,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                    a_component: {
                        key: "a_component",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 54321,
                            source: "dynamic" as const,
                        },
                        structuralHash: asStructuralHash("hash-a"),
                        generatedAt: 54321,
                        ttlMs: 60000,
                        quality: { confidence: 0.8, warnings: [] },
                    },
                },
            };

            const normalized = normalizeManifest(manifest);

            expect(normalized.build.builtAt).toBe(0);
            expect(normalized.entries.a_component.generatedAt).toBe(0);
            expect(normalized.entries.z_component.generatedAt).toBe(0);

            // Verify entry order (should be sorted by key)
            const keys = Object.keys(normalized.entries);
            expect(keys[0]).toBe("a_component");
            expect(keys[1]).toBe("z_component");
        });

        it("should strip entropy from manifests for determinism", () => {
            const manifest1: BlueprintManifest = {
                manifestVersion: 1,
                packageVersion: "0.1.0",
                build: {
                    builtAt: Date.now(), // Current time
                    appVersion: "test",
                },
                defaults: {
                    ttlMs: 60000,
                },
                entries: {
                    button: {
                        key: "button",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: Date.now(),
                            source: "dynamic" as const,
                        },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: Date.now(),
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const manifest2: BlueprintManifest = {
                manifestVersion: 1,
                packageVersion: "0.1.0",
                build: {
                    builtAt: Date.now() + 1000, // Different time
                    appVersion: "test",
                },
                defaults: {
                    ttlMs: 60000,
                },
                entries: {
                    button: {
                        key: "button",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: Date.now() + 1000,
                            source: "dynamic" as const,
                        },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: Date.now() + 1000,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const norm1 = normalizeManifest(manifest1);
            const norm2 = normalizeManifest(manifest2);

            // After normalization, both should be identical (timestamps stripped)
            const json1 = JSON.stringify(norm1);
            const json2 = JSON.stringify(norm2);
            expect(json1).toBe(json2);
        });

        it("should classify diffs as expected vs unexpected", () => {
            const old: BlueprintManifest = {
                manifestVersion: 1,
                packageVersion: "0.1.0",
                build: { builtAt: 0, appVersion: "test" },
                defaults: { ttlMs: 60000 },
                entries: {
                    btn: {
                        key: "btn",
                        blueprint: { version: 1, rootWidth: 100, rootHeight: 40, nodes: [], generatedAt: 0, source: "dynamic" as const },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const new_: BlueprintManifest = {
                ...old,
                entries: {
                    ...old.entries,
                    newbtn: {
                        key: "newbtn",
                        blueprint: { version: 1, rootWidth: 100, rootHeight: 40, nodes: [], generatedAt: 0, source: "dynamic" as const },
                        structuralHash: asStructuralHash("hash-2"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const diffs = classifyManifestDiffs(old, new_, new Set());
            expect(diffs.length).toBeGreaterThan(0);

            // Added key should be classified as unexpected (since not in expectedChangedKeys)
            const addedDiff = diffs.find(d => d.key === "newbtn");
            expect(addedDiff?.classification).toBe("unexpected");
        });

        it("should mark diffs as expected when in expected set", () => {
            const old: BlueprintManifest = {
                manifestVersion: 1,
                packageVersion: "0.1.0",
                build: { builtAt: 0, appVersion: "test" },
                defaults: { ttlMs: 60000 },
                entries: {
                    btn: {
                        key: "btn",
                        blueprint: { version: 1, rootWidth: 100, rootHeight: 40, nodes: [], generatedAt: 0, source: "dynamic" as const },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const new_: BlueprintManifest = {
                ...old,
                entries: {
                    btn: {
                        key: "btn",
                        blueprint: { version: 1, rootWidth: 150, rootHeight: 40, nodes: [], generatedAt: 0, source: "dynamic" as const },
                        structuralHash: asStructuralHash("hash-1-modified"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            };

            const expectedChanges = new Set(["btn"]);
            const diffs = classifyManifestDiffs(old, new_, expectedChanges);

            const btnDiff = diffs.find(d => d.key === "btn");
            expect(btnDiff?.classification).toBe("expected");
        });

        // Gate 2: Determinism <= 1% unexpected diffs
        it("GATE: B2_DETERMINISM_GATE - unexpected diff rate <= 1%", () => {
            // Simulate 20 runs with minimal diff
            const runs = [];
            for (let i = 0; i < 20; i++) {
                const manifest: BlueprintManifest = {
                    manifestVersion: 1,
                    packageVersion: "0.1.0",
                    build: { builtAt: Date.now() + i, appVersion: "test" }, // Time shifts each run
                    defaults: { ttlMs: 60000 },
                    entries: {
                        btn: {
                            key: "btn",
                            blueprint: { version: 1, rootWidth: 100, rootHeight: 40, nodes: [], generatedAt: Date.now() + i, source: "dynamic" as const },
                            structuralHash: asStructuralHash("hash-stable"),
                            generatedAt: Date.now() + i,
                            ttlMs: 60000,
                            quality: { confidence: 0.9, warnings: [] },
                        },
                    },
                };
                runs.push(normalizeManifest(manifest));
            }

            // After normalization, all runs should be identical
            const json0 = JSON.stringify(runs[0]);
            let unexpectedDiffs = 0;
            for (let i = 1; i < runs.length; i++) {
                const jsonI = JSON.stringify(runs[i]);
                if (jsonI !== json0) {
                    unexpectedDiffs++;
                }
            }

            const unexpectedDiffRate = unexpectedDiffs / (runs.length - 1);
            expect(unexpectedDiffRate).toBeLessThanOrEqual(0.01); // <= 1%
        });

        it("should handle node array normalization with sorting", () => {
            const entry = {
                key: "test",
                blueprint: {
                    version: 1,
                    rootWidth: 100,
                    rootHeight: 40,
                    nodes: [
                        createTestNode("z"),
                        createTestNode("a"),
                        createTestNode("m"),
                    ],
                    generatedAt: 0,
                    source: "dynamic" as const,
                },
                structuralHash: asStructuralHash("hash"),
                generatedAt: 0,
                ttlMs: 60000,
                quality: { confidence: 0.9, warnings: [] },
            };

            const normalized = normalizeManifestEntry(entry);
            const nodeIds = normalized.blueprint.nodes.map((n) => n.id);

            // Nodes should be sorted
            expect(nodeIds).toEqual(["a", "m", "z"]);
        });
    });
});
