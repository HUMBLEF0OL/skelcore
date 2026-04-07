import { describe, it, expect } from "vitest";
import { computeParityReport, classifyParityReason } from "../capture/parity-scorer";
import type { CapturedArtifact, ParityObservation } from "../types";

describe("parity", () => {
    describe("B1: Capture Parity Baseline", () => {
        it("computes parity from route x breakpoint observations", () => {
            const observations: ParityObservation[] = [
                {
                    route: "/rtl",
                    breakpoint: 375,
                    discoveredKeys: ["A"],
                    extractedKeys: ["A"],
                    extractionFailures: 0,
                },
                {
                    route: "/rtl",
                    breakpoint: 768,
                    discoveredKeys: ["A"],
                    extractedKeys: [],
                    extractionFailures: 1,
                },
            ];

            const report = computeParityReport([], ["/rtl"], [375, 768], 0.95, observations);

            expect(report.totalChecks).toBe(2);
            expect(report.matchedCount).toBe(1);
            expect(report.parityRate).toBe(0.5);
            expect(report.mismatches[0]?.reason).toBe("missing_selector");
            expect(report.reasonCounts.missing_selector).toBe(1);
        });

        it("uses deterministic reason codes", () => {
            const observations: ParityObservation[] = [
                {
                    route: "/rtl",
                    breakpoint: 375,
                    discoveredKeys: ["A"],
                    extractedKeys: ["B"],
                    extractionFailures: 0,
                },
            ];

            const report = computeParityReport([], ["/rtl", "/reference"], [375, 768], 0.95, observations);
            expect(report.mismatches.map((item) => item.reason)).toEqual([
                "missing_selector",
                "breakpoint_mismatch",
                "route_missing_artifact",
                "route_missing_artifact",
            ]);
            expect(report.reasonCounts).toEqual({
                missing_selector: 1,
                extra_selector: 0,
                breakpoint_mismatch: 1,
                route_missing_artifact: 2,
            });
        });

        it("enforces threshold based on true matrix parity", () => {
            const observations: ParityObservation[] = [
                {
                    route: "/rtl",
                    breakpoint: 375,
                    discoveredKeys: ["A"],
                    extractedKeys: ["A"],
                    extractionFailures: 0,
                },
            ];

            const report = computeParityReport([], ["/rtl"], [375, 768], 0.95, observations);
            expect(report.passed).toBe(false);
            expect(report.parityRate).toBe(0.5);
        });

        it("is deterministic for the same input", () => {
            const observations: ParityObservation[] = [
                {
                    route: "/rtl",
                    breakpoint: 375,
                    discoveredKeys: ["A", "B"],
                    extractedKeys: ["A"],
                    extractionFailures: 1,
                },
            ];

            const a = computeParityReport([], ["/rtl"], [375], 0.95, observations);
            const b = computeParityReport([], ["/rtl"], [375], 0.95, observations);
            expect(a.matchedCount).toBe(b.matchedCount);
            expect(a.parityRate).toBe(b.parityRate);
            expect(a.mismatches).toEqual(b.mismatches);
            expect(a.reasonCounts).toEqual(b.reasonCounts);
        });

        it("classifies parity reasons consistently", () => {
            expect(classifyParityReason(undefined, undefined)).toBe("matched");
            expect(classifyParityReason("value", undefined)).toBe("route_missing_artifact");
            expect(classifyParityReason(undefined, "value")).toBe("extra_selector");
            expect(classifyParityReason("x", "y", "breakpoint missing")).toBe("breakpoint_mismatch");
            expect(classifyParityReason("x", "y")).toBe("missing_selector");
        });

        it("keeps report structure machine-readable", () => {
            const report = computeParityReport([] as CapturedArtifact[], ["/rtl"], [375], 0.95, []);
            expect(report).toHaveProperty("generatedAt");
            expect(report).toHaveProperty("mismatches");
            expect(report).toHaveProperty("reasonCounts");
            expect(report.reasonCounts).toEqual({
                missing_selector: 0,
                extra_selector: 0,
                breakpoint_mismatch: 0,
                route_missing_artifact: 1,
            });
        });
    });
});
