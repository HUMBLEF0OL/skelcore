import { describe, expect, it, beforeEach } from "vitest";
import type { RolloutEvent } from "../types.js";
import { RolloutEventCollector } from "../rollout-telemetry.js";

describe("RolloutEvent types", () => {
  it("emits canary-validation events with request context", () => {
    const event: RolloutEvent = {
      type: "canary-validation",
      timestamp: Date.now(),
      environment: "staging",
      routeKey: "ProductCard",
      requestId: "req-123",
      policyVersion: 1,
      payload: {
        sampledRequests: 100,
        errorRate: 0.02,
        p99LatencyMs: 245,
      },
    };
    expect(event.type).toBe("canary-validation");
    expect(["dev", "staging", "prod"]).toContain(event.environment);
    expect(event.policyVersion).toBeGreaterThanOrEqual(1);
  });

  it("emits rollout-decision events with deterministic flags and proof", () => {
    const event: RolloutEvent = {
      type: "rollout-decision",
      timestamp: Date.now(),
      environment: "prod",
      routeKey: "HeroBanner",
      requestId: "req-456",
      policyVersion: 1,
      decision: "proceed",
      decisionProof: {
        thresholdErrorRate: 0.05,
        observedErrorRate: 0.01,
        passed: true,
        reason: "error-rate-within-threshold",
      },
    };
    expect(["proceed", "rollback", "hold"]).toContain(event.decision);
    expect(event.decisionProof?.passed).toBe(true);
  });

  it("emits rollback-triggered events with decision trace", () => {
    const event: RolloutEvent = {
      type: "rollback-triggered",
      timestamp: Date.now(),
      environment: "staging",
      routeKey: "ProductList",
      requestId: "req-789",
      policyVersion: 2,
      decision: "rollback",
      decisionProof: {
        thresholdErrorRate: 0.05,
        observedErrorRate: 0.12,
        passed: false,
        reason: "error-rate-exceeded",
      },
      rollbackTarget: 1,
    };
    expect(event.decision).toBe("rollback");
    expect(event.rollbackTarget).toBeDefined();
  });
});

describe("RolloutEventCollector", () => {
  beforeEach(() => {
    // Note: actual tests will need to use a separate instance per test
    // since globalRolloutCollector is singleton
  });

  it("emits and retrieves events in order", () => {
    const collector = new RolloutEventCollector();
    const event1: RolloutEvent = {
      type: "strategy-selected",
      timestamp: 1000,
      environment: "prod",
      routeKey: "Card",
      requestId: "1",
      policyVersion: 1,
    };
    const event2: RolloutEvent = {
      type: "canary-validation",
      timestamp: 2000,
      environment: "prod",
      routeKey: "Card",
      requestId: "2",
      policyVersion: 1,
    };
    collector.emit(event1);
    collector.emit(event2);
    const events = collector.getAllEvents();
    expect(events).toHaveLength(2);
    expect(events[0].timestamp).toBe(1000);
    expect(events[1].timestamp).toBe(2000);
  });

  it("filters by environment", () => {
    const collector = new RolloutEventCollector();
    collector.emit({
      type: "canary-validation",
      timestamp: 1000,
      environment: "dev",
      routeKey: "Card",
      requestId: "1",
      policyVersion: 1,
    });
    collector.emit({
      type: "canary-validation",
      timestamp: 1100,
      environment: "prod",
      routeKey: "Card",
      requestId: "2",
      policyVersion: 1,
    });
    const devEvents = collector.getEventsByEnvironment("dev");
    expect(devEvents).toHaveLength(1);
    expect(devEvents[0].environment).toBe("dev");
  });

  it("computes metrics correctly", () => {
    const collector = new RolloutEventCollector();
    collector.emit({
      type: "rollout-decision",
      timestamp: 1000,
      environment: "prod",
      routeKey: "Card",
      requestId: "1",
      policyVersion: 1,
      decision: "proceed",
    });
    collector.emit({
      type: "rollout-decision",
      timestamp: 1100,
      environment: "prod",
      routeKey: "Card",
      requestId: "2",
      policyVersion: 1,
      decision: "rollback",
    });
    const metrics = collector.getMetrics();
    expect(metrics.totalEvents).toBe(2);
    expect(metrics.decisionCounts.proceed).toBe(1);
    expect(metrics.decisionCounts.rollback).toBe(1);
    expect(metrics.environmentMetrics.prod.proceededCount).toBe(1);
    expect(metrics.environmentMetrics.prod.rolledBackCount).toBe(1);
  });

  it("filters events by timestamp", () => {
    const collector = new RolloutEventCollector();
    collector.emit({
      type: "strategy-selected",
      timestamp: 1000,
      environment: "prod",
      routeKey: "Card",
      requestId: "1",
      policyVersion: 1,
    });
    collector.emit({
      type: "strategy-selected",
      timestamp: 2000,
      environment: "prod",
      routeKey: "Card",
      requestId: "2",
      policyVersion: 1,
    });
    const recentEvents = collector.getEventsSince(1500);
    expect(recentEvents).toHaveLength(1);
    expect(recentEvents[0].timestamp).toBe(2000);
  });

  it("clears all events", () => {
    const collector = new RolloutEventCollector();
    collector.emit({
      type: "strategy-selected",
      timestamp: 1000,
      environment: "prod",
      routeKey: "Card",
      requestId: "1",
      policyVersion: 1,
    });
    expect(collector.getAllEvents()).toHaveLength(1);
    collector.clear();
    expect(collector.getAllEvents()).toHaveLength(0);
  });
});
