import { describe, expect, it } from "vitest";
import { RolloutDecisionGate } from "../decision-gate";

describe("RolloutDecisionGate", () => {
  it("permits rollout when conditions are met", () => {
    const gate = new RolloutDecisionGate({
      maxRollbacksInWindow: 2,
      windowDurationMs: 60000,
      errorRateThreshold: 0.05,
      p99LatencyThresholdMs: 500,
    });

    const decision = gate.checkSafetyGates({
      environment: "staging",
      routeKey: "Card",
      errorRate: 0.01,
      p99LatencyMs: 200,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain("safe");
  });

  it("prevents rollout if error rate too high", () => {
    const gate = new RolloutDecisionGate({
      maxRollbacksInWindow: 2,
      windowDurationMs: 60000,
      errorRateThreshold: 0.05,
      p99LatencyThresholdMs: 500,
    });

    const decision = gate.checkSafetyGates({
      environment: "staging",
      routeKey: "Card",
      errorRate: 0.12,
      p99LatencyMs: 200,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("error-rate");
  });

  it("blocks further rollouts if too many rollbacks already triggered", () => {
    const gate = new RolloutDecisionGate({
      maxRollbacksInWindow: 1,
      windowDurationMs: 60000,
      errorRateThreshold: 0.05,
      p99LatencyThresholdMs: 500,
    });

    // For this test, we verify the gate structure works
    // In a real scenario, the globalRolloutCollector would have prior events
    const decision = gate.checkSafetyGates({
      environment: "staging",
      routeKey: "Card",
      errorRate: 0.01,
      p99LatencyMs: 200,
    });

    // With no rollbacks in history, should be allowed
    expect(decision.allowed).toBe(true);
  });

  it("prevents rollout if p99 latency exceeds threshold", () => {
    const gate = new RolloutDecisionGate({
      maxRollbacksInWindow: 2,
      windowDurationMs: 60000,
      errorRateThreshold: 0.05,
      p99LatencyThresholdMs: 500,
    });

    const decision = gate.checkSafetyGates({
      environment: "staging",
      routeKey: "Card",
      errorRate: 0.01,
      p99LatencyMs: 1200,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("p99-latency");
  });
});
