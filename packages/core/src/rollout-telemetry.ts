import type {
  RolloutEvent,
  RolloutMetrics,
  RolloutMetricsPerEnv,
  RolloutEnvironment,
  RolloutEventType,
  RolloutDecision,
} from "./types.js";

export class RolloutEventCollector {
  private events: RolloutEvent[] = [];
  private maxEventCapacity = 10000; // prevent unbounded memory growth

  emit(event: RolloutEvent): void {
    if (this.events.length >= this.maxEventCapacity) {
      this.events.shift(); // FIFO eviction if at capacity
    }
    this.events.push(event);
  }

  getAllEvents(): RolloutEvent[] {
    return [...this.events];
  }

  getEventsSince(timestamp: number): RolloutEvent[] {
    return this.events.filter((e) => e.timestamp >= timestamp);
  }

  getEventsByEnvironment(env: RolloutEnvironment): RolloutEvent[] {
    return this.events.filter((e) => e.environment === env);
  }

  getMetrics(): RolloutMetrics {
    const eventsByType: Record<RolloutEventType, number> = {
      "canary-validation": 0,
      "rollout-decision": 0,
      "rollback-triggered": 0,
      "strategy-selected": 0,
      "safety-gate-check": 0,
      "anomaly-detected": 0,
    };

    const decisionCounts: Record<RolloutDecision, number> = {
      proceed: 0,
      rollback: 0,
      hold: 0,
    };

    const environmentMetrics: Record<RolloutEnvironment, RolloutMetricsPerEnv> = {
      dev: {
        eventsObserved: 0,
        proceededCount: 0,
        rolledBackCount: 0,
        heldCount: 0,
      },
      staging: {
        eventsObserved: 0,
        proceededCount: 0,
        rolledBackCount: 0,
        heldCount: 0,
      },
      prod: {
        eventsObserved: 0,
        proceededCount: 0,
        rolledBackCount: 0,
        heldCount: 0,
      },
    };

    for (const event of this.events) {
      eventsByType[event.type]++;
      if (event.decision) {
        decisionCounts[event.decision]++;
      }
      environmentMetrics[event.environment].eventsObserved++;

      if (event.decision === "proceed") {
        environmentMetrics[event.environment].proceededCount++;
      } else if (event.decision === "rollback") {
        environmentMetrics[event.environment].rolledBackCount++;
        if (!environmentMetrics[event.environment].lastRollbackAt) {
          environmentMetrics[event.environment].lastRollbackAt = event.timestamp;
        }
      } else if (event.decision === "hold") {
        environmentMetrics[event.environment].heldCount++;
      }
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      decisionCounts,
      environmentMetrics,
    };
  }

  clear(): void {
    this.events = [];
  }
}

export const globalRolloutCollector = new RolloutEventCollector();
