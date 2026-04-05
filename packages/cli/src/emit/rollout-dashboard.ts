import type { RolloutMetrics } from "@ghostframe/core";

export function renderRolloutDashboard(metrics: RolloutMetrics): string {
  const environmentLines = Object.entries(metrics.environmentMetrics)
    .map(([environment, envMetrics]) => {
      return [
        `- ${environment}:`,
        `  eventsObserved: ${envMetrics.eventsObserved}`,
        `  proceededCount: ${envMetrics.proceededCount}`,
        `  rolledBackCount: ${envMetrics.rolledBackCount}`,
        `  heldCount: ${envMetrics.heldCount}`,
        `  lastRollbackAt: ${envMetrics.lastRollbackAt ?? "n/a"}`,
      ].join("\n");
    })
    .join("\n");

  return [
    "# Rollout Status",
    "",
    `totalEvents: ${metrics.totalEvents}`,
    `eventsByType: ${JSON.stringify(metrics.eventsByType)}`,
    `decisionCounts: ${JSON.stringify(metrics.decisionCounts)}`,
    "",
    "environmentMetrics:",
    environmentLines,
  ].join("\n");
}
