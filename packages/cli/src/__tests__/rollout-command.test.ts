import { beforeEach, describe, expect, it, vi } from "vitest";
import { globalRolloutCollector } from "@ghostframe/core";
import { runCli } from "../index";

describe("rollout command", () => {
  beforeEach(() => {
    globalRolloutCollector.clear();
  });

  it("runs rollout evaluate and returns zero", async () => {
    const io = { log: vi.fn(), error: vi.fn() };

    const code = await runCli(
      [
        "rollout",
        "evaluate",
        "--strategy",
        "canary",
        "--environment",
        "staging",
        "--route-key",
        "ProductCard",
        "--request-id",
        "req-cli-1",
        "--error-rate",
        "0.01",
        "--p99-latency-ms",
        "200",
      ],
      io
    );

    expect(code).toBe(0);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("decision"));
  });

  it("runs rollout status --format json", async () => {
    const io = { log: vi.fn(), error: vi.fn() };

    const code = await runCli(["rollout", "status", "--format", "json"], io);

    expect(code).toBe(0);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("totalEvents"));
  });
});
