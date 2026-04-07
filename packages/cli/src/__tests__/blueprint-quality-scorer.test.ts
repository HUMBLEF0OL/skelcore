import { describe, it, expect } from "vitest";
import { scoreBlueprint, isQualityAcceptable } from "../capture/blueprint-quality-scorer";
import type { BlueprintNode, ManifestEntry } from "@ghostframes/core";

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

describe("Blueprint Quality Scorer", () => {
    const createTestEntry = (overrides: Partial<ManifestEntry> = {}): ManifestEntry => {
        return {
            key: "TestComponent",
            blueprint: {
                version: 1,
                rootWidth: 300,
                rootHeight: 200,
                nodes: [],
                generatedAt: Date.now(),
                source: "dynamic",
            },
            structuralHash: "hash123" as any,
            generatedAt: Date.now(),
            ttlMs: 86400000,
            quality: {
                confidence: 0.95,
                warnings: [],
            },
            ...overrides,
        };
    };

    describe("scoreBlueprint", () => {
        it("scores a complete blueprint with high quality", () => {
            const entry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "span"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
            });

            const score = scoreBlueprint(entry);
            expect(score).toBeGreaterThan(0.85);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        it("penalizes empty node lists", () => {
            const emptyEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
            });

            const emptyScore = scoreBlueprint(emptyEntry);
            expect(emptyScore).toBeLessThan(0.75);
            expect(emptyScore).toBeGreaterThan(0.5);
        });

        it("penalizes low confidence values", () => {
            const lowConfidenceEntry = createTestEntry({
                quality: {
                    confidence: 0.3,
                    warnings: [],
                },
            });

            const score = scoreBlueprint(lowConfidenceEntry);
            expect(score).toBeLessThan(0.6);
        });

        it("penalizes entries with warnings", () => {
            const warnedEntry = createTestEntry({
                quality: {
                    confidence: 0.95,
                    warnings: ["font-not-loaded", "responsive-detected"],
                },
            });

            const score = scoreBlueprint(warnedEntry);
            expect(score).toBeLessThan(0.95);
        });

        it("penalizes small viewport dimensions", () => {
            const smallEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 20,
                    rootHeight: 20,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
            });

            const score = scoreBlueprint(smallEntry);
            expect(score).toBeLessThan(0.65);
        });

        it("combines multiple penalties for poor blueprints", () => {
            const poorEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 15,
                    rootHeight: 15,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.4,
                    warnings: ["mvp-dom-box-extraction", "style-drift-detected"],
                },
            });

            const score = scoreBlueprint(poorEntry);
            expect(score).toBeLessThan(0.5);
        });
    });

    describe("isQualityAcceptable", () => {
        it("accepts blueprints with score >= 0.90", () => {
            const goodEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 400,
                    rootHeight: 300,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "section"),
                        createNode("n3", "header"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.98,
                    warnings: [],
                },
            });

            const accepted = isQualityAcceptable(goodEntry, { threshold: 0.9 });
            expect(accepted).toBe(true);
        });

        it("rejects blueprints with score < threshold", () => {
            const poorEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 20,
                    rootHeight: 20,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.2,
                    warnings: ["critical-warning"],
                },
            });

            const accepted = isQualityAcceptable(poorEntry, { threshold: 0.9 });
            expect(accepted).toBe(false);
        });

        it("uses default threshold of 0.88 if not specified", () => {
            const mediumEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "span"),
                        createNode("n3", "section"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.94,
                    warnings: [],
                },
            });

            const accepted = isQualityAcceptable(mediumEntry);
            expect(accepted).toBe(true);
        });
    });

    describe("integrated quality workflow", () => {
        it("correctly filters pilot matrix for acceptable blueprints", () => {
            const entries: ManifestEntry[] = [
                createTestEntry({
                    key: "ProductCard",
                    blueprint: {
                        version: 1,
                        rootWidth: 350,
                        rootHeight: 400,
                        nodes: [
                            createNode("n1", "div", [createNode("n2", "img")]),
                            createNode("n3", "section"),
                            createNode("n4", "p"),
                        ],
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    quality: { confidence: 0.96, warnings: [] },
                }),
                createTestEntry({
                    key: "LoadingShimmer",
                    blueprint: {
                        version: 1,
                        rootWidth: 30,
                        rootHeight: 10,
                        nodes: [],
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    quality: { confidence: 0.2, warnings: ["too-small"] },
                }),
                createTestEntry({
                    key: "ComplexLayout",
                    blueprint: {
                        version: 1,
                        rootWidth: 600,
                        rootHeight: 500,
                        nodes: Array.from({ length: 15 }, (_, i) => createNode(`n${i}`, "div")),
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    quality: { confidence: 0.92, warnings: [] },
                }),
            ];

            const acceptable = entries.filter((e) => isQualityAcceptable(e, { threshold: 0.9 }));
            expect(acceptable).toHaveLength(2);
            expect(acceptable.map((e) => e.key)).toContain("ProductCard");
            expect(acceptable.map((e) => e.key)).toContain("ComplexLayout");
        });
    });

    describe("B3 Edge Cases and Stress Tests", () => {
        it("handles extreme high dimensions gracefully", () => {
            const hugeEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 4000,
                    rootHeight: 4000,
                    nodes: Array.from({ length: 50 }, (_, i) => createNode(`n${i}`, "div")),
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.95,
                    warnings: [],
                },
            });

            const score = scoreBlueprint(hugeEntry);
            expect(score).toBeGreaterThan(0.85);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        it("handles large DOM trees (100+ nodes) with consistent scoring", () => {
            const largeEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 500,
                    rootHeight: 400,
                    nodes: Array.from({ length: 150 }, (_, i) =>
                        createNode(`n${i}`, i % 2 === 0 ? "div" : "span")
                    ),
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.92,
                    warnings: [],
                },
            });

            const score = scoreBlueprint(largeEntry);
            expect(score).toBeGreaterThan(0.85);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        it("handles threshold boundaries for 0.88 and 0.90", () => {
            const boundaryEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 250,
                    rootHeight: 180,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "div"),
                        createNode("n3", "div"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.88,
                    warnings: [],
                },
            });

            expect(isQualityAcceptable(boundaryEntry, { threshold: 0.88 })).toBe(true);
            expect(isQualityAcceptable(boundaryEntry, { threshold: 0.9 })).toBe(true);
        });

        it("handles zero confidence with non-empty nodes", () => {
            const zeroConfEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "div"),
                        createNode("n3", "div"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0,
                    warnings: [],
                },
            });

            const score = scoreBlueprint(zeroConfEntry);
            expect(score).toBeLessThanOrEqual(0.6);
            expect(isQualityAcceptable(zeroConfEntry, { threshold: 0.9 })).toBe(false);
        });

        it("handles maximum warning penalties without score collapse", () => {
            const maxWarnEntry = createTestEntry({
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [
                        createNode("n1", "div"),
                        createNode("n2", "div"),
                    ],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                quality: {
                    confidence: 0.98,
                    warnings: Array.from({ length: 15 }, (_, i) => `warning-${i}`),
                },
            });

            const score = scoreBlueprint(maxWarnEntry);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        it("maintains pilot quality threshold at or above 0.90", () => {
            const pilotEntries = [
                createTestEntry({
                    key: "Route1",
                    blueprint: {
                        version: 1,
                        rootWidth: 400,
                        rootHeight: 300,
                        nodes: Array.from({ length: 8 }, (_, i) => createNode(`n${i}`, "div")),
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    quality: { confidence: 0.96, warnings: [] },
                }),
                createTestEntry({
                    key: "Route2",
                    blueprint: {
                        version: 1,
                        rootWidth: 350,
                        rootHeight: 250,
                        nodes: Array.from({ length: 12 }, (_, i) => createNode(`n${i}`, "div")),
                        generatedAt: Date.now(),
                        source: "dynamic",
                    },
                    quality: { confidence: 0.94, warnings: [] },
                }),
            ];

            const acceptanceRate =
                pilotEntries.filter((e) => isQualityAcceptable(e, { threshold: 0.9 })).length /
                pilotEntries.length;

            expect(acceptanceRate).toBeGreaterThanOrEqual(0.95);
        });
    });
});
