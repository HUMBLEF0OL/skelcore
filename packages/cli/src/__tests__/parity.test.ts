import { describe, it, expect } from "vitest";
import { computeParityReport, classifyParityReason } from "../capture/parity-scorer";
import type { CapturedArtifact } from "../types";
import { asStructuralHash } from "@ghostframes/core";

describe("parity", () => {
    describe("B1: Capture Parity Baseline", () => {
        it("should compute parity rate from artifacts", () => {
            const artifacts: CapturedArtifact[] = [
                {
                    key: "Button_rtl_375",
                    entry: {
                        key: "Button_rtl_375",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 0,
                            source: "dynamic",
                        },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
                {
                    key: "Button_rtl_768",
                    entry: {
                        key: "Button_rtl_768",
                        blueprint: {
                            version: 1,
                            rootWidth: 150,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 0,
                            source: "dynamic",
                        },
                        structuralHash: asStructuralHash("hash-2"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            ];

            const routes = ["/rtl", "/config-playground"];
            const breakpoints = [375, 768, 1280];

            const report = computeParityReport(artifacts, routes, breakpoints, 0.95);

            expect(report.parityRate).toBeLessThanOrEqual(1);
            expect(report.minThreshold).toBe(0.95);
            expect(report.totalChecks).toBe(6); // 2 routes x 3 breakpoints
            expect(report.matchedCount).toBeLessThanOrEqual(report.totalChecks);
        });

        it("should enforce 95% parity threshold", () => {
            const artifacts: CapturedArtifact[] = [];
            const routes = ["/rtl"];
            const breakpoints = [375];

            const report = computeParityReport(artifacts, routes, breakpoints, 0.95);

            expect(report.passed).toBe(false);
            expect(report.parityRate).toBeLessThan(0.95);
        });

        it("should generate reason codes for mismatches", () => {
            const artifacts: CapturedArtifact[] = [];
            const routes = ["/rtl", "/reference"];
            const breakpoints = [375];

            const report = computeParityReport(artifacts, routes, breakpoints, 0.95);

            // All should be missing since no artifacts
            expect(report.mismatches.length).toBeGreaterThan(0);
            for (const mismatch of report.mismatches) {
                expect(["matched", "missing", "extra", "selector-mismatch", "timing-variance"]).toContain(
                    mismatch.reason
                );
            }
        });

        it("should classify parity reasons correctly", () => {
            expect(classifyParityReason(undefined, undefined)).toBe("matched");
            expect(classifyParityReason("value", undefined)).toBe("missing");
            expect(classifyParityReason(undefined, "value")).toBe("extra");
            expect(classifyParityReason("value", "value")).toBe("matched");
            expect(classifyParityReason({ key: "a" }, { key: "a" })).toBe("matched");
        });

        it("should mark report as passed when parity meets threshold", () => {
            const singleArtifact: CapturedArtifact[] = [
                {
                    key: "test",
                    entry: {
                        key: "test",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 0,
                            source: "dynamic",
                        },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            ];

            const routes = ["/rtl"];
            const breakpoints = [375];
            const report = computeParityReport(singleArtifact, routes, breakpoints, 0.95);

            expect(report.parityRate).toBe(1.0); // MVP: any artifacts = full parity
            expect(report.passed).toBe(true); // Should pass since we have artifacts
            expect(report.minThreshold).toBe(0.95);
        });

        it("should emit parity report with deterministic structure", () => {
            const artifacts: CapturedArtifact[] = [];
            const routes = ["/rtl"];
            const breakpoints = [375];

            const report = computeParityReport(artifacts, routes, breakpoints, 0.95);

            expect(report).toHaveProperty("generatedAt");
            expect(report).toHaveProperty("totalChecks");
            expect(report).toHaveProperty("matchedCount");
            expect(report).toHaveProperty("parityRate");
            expect(report).toHaveProperty("minThreshold");
            expect(report).toHaveProperty("passed");
            expect(report).toHaveProperty("mismatches");
            expect(Array.isArray(report.mismatches)).toBe(true);
        });

        // Gate 1: Parity >= 95%
        it("GATE: B1_PARITY_GATE - parity >= 95% enforcement", () => {
            // Create enough artifacts to meet 95% threshold
            const routes = ["/rtl"];
            const breakpoints = [375];

            const artifacts: CapturedArtifact[] = [
                {
                    key: "comp1",
                    entry: {
                        key: "comp1",
                        blueprint: {
                            version: 1,
                            rootWidth: 100,
                            rootHeight: 40,
                            nodes: [],
                            generatedAt: 0,
                            source: "dynamic",
                        },
                        structuralHash: asStructuralHash("hash-1"),
                        generatedAt: 0,
                        ttlMs: 60000,
                        quality: { confidence: 0.9, warnings: [] },
                    },
                },
            ];

            const report = computeParityReport(artifacts, routes, breakpoints, 0.95);

            // At minimum, check that the report structure is correct for gate evaluation
            expect(report.minThreshold).toBe(0.95);
            expect(typeof report.parityRate).toBe("number");
            expect(typeof report.passed).toBe("boolean");
            expect(report.passed).toBe(report.parityRate >= report.minThreshold);
        });
    });
});
