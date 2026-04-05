import { globalRolloutCollector } from "@ghostframe/core";
import type { RolloutEnvironment } from "@ghostframe/core";
import { renderRolloutDashboard } from "../emit/rollout-dashboard.js";
import { evaluateRolloutControlPlane } from "../rollout/control-plane.js";
import type { RolloutStrategy } from "../rollout/policy-resolver.js";
import type { CliIo } from "../types";

interface RolloutArgs {
  strategy: RolloutStrategy;
  environment: RolloutEnvironment;
  routeKey: string;
  requestId: string;
  errorRate: number;
  p99LatencyMs: number;
  format: "json" | "markdown";
}

export async function runRolloutCommand(argv: string[], io: CliIo): Promise<number> {
  const [subcommand, ...rest] = argv;

  if (subcommand === "evaluate") {
    const args = parseArgs(rest);
    const sharedInput = {
      environment: args.environment,
      routeKey: args.routeKey,
      requestId: args.requestId,
      policyVersion: 1,
      safetyGate: {
        maxRollbacksInWindow: 2,
        windowDurationMs: 300_000,
        errorRateThreshold: 0.2,
        p99LatencyThresholdMs: 1000,
      },
    };

    const result =
      args.strategy === "feature-flag"
        ? evaluateRolloutControlPlane({
            ...sharedInput,
            strategy: "feature-flag",
            policy: {
              flagName: args.routeKey,
              enabledByDefault: false,
              rolloutPercentage: 50,
              overrides: {},
            },
          })
        : args.strategy === "staged"
          ? evaluateRolloutControlPlane({
              ...sharedInput,
              strategy: "staged",
              policy: {
                stages: [
                  { percentageOfTraffic: 10, durationMs: 60_000 },
                  { percentageOfTraffic: 100, durationMs: 0 },
                ],
                errorRateThreshold: 0.05,
                p99LatencyThresholdMs: 500,
                rollbackOnAnyStageFailure: true,
              },
              elapsedMs: 0,
              observations: {
                errorRate: args.errorRate,
                p99LatencyMs: args.p99LatencyMs,
              },
            })
          : evaluateRolloutControlPlane({
              ...sharedInput,
              strategy: "canary",
              policy: {
                sampledRequests: 100,
                errorRateThreshold: 0.05,
                p99LatencyThresholdMs: 500,
                canaryDurationMs: 60_000,
                minimumSampleSize: 50,
              },
              observations: {
                sampledRequests: 100,
                errorRate: args.errorRate,
                p99LatencyMs: args.p99LatencyMs,
                observationWindowMs: 60_000,
              },
            });

    io.log(JSON.stringify({ decision: result.decision, reason: result.reason }, null, 2));
    return result.decision === "rollback" ? 1 : 0;
  }

  if (subcommand === "status") {
    const args = parseArgs(rest);
    const metrics = globalRolloutCollector.getMetrics();
    io.log(
      args.format === "json" ? JSON.stringify(metrics, null, 2) : renderRolloutDashboard(metrics)
    );
    return 0;
  }

  io.error("Usage: rollout <evaluate|status> [options]");
  return 1;
}

function parseArgs(argv: string[]): RolloutArgs {
  const parsed: RolloutArgs = {
    strategy: "canary",
    environment: "staging",
    routeKey: "unknown-route",
    requestId: `req-${Date.now()}`,
    errorRate: 0,
    p99LatencyMs: 0,
    format: "markdown",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--strategy") {
      if (next === "canary" || next === "feature-flag" || next === "staged") {
        parsed.strategy = next;
      }
      i += 1;
      continue;
    }

    if (arg === "--environment") {
      if (next === "dev" || next === "staging" || next === "prod") {
        parsed.environment = next;
      }
      i += 1;
      continue;
    }

    if (arg === "--route-key") {
      parsed.routeKey = next ?? parsed.routeKey;
      i += 1;
      continue;
    }

    if (arg === "--request-id") {
      parsed.requestId = next ?? parsed.requestId;
      i += 1;
      continue;
    }

    if (arg === "--error-rate") {
      parsed.errorRate = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--p99-latency-ms") {
      parsed.p99LatencyMs = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      parsed.format = next === "json" ? "json" : "markdown";
      i += 1;
      continue;
    }
  }

  return parsed;
}
