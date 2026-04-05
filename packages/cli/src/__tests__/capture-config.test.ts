import { describe, expect, it } from "vitest";
import { resolveCaptureConfig } from "../config/capture-config";

describe("resolveCaptureConfig", () => {
  it("applies defaults when only routes are provided", async () => {
    const config = await resolveCaptureConfig({
      rootDir: process.cwd(),
      inline: { routes: ["/", "/reference", "/advanced"] },
    });

    expect(config.breakpoints.length).toBeGreaterThan(0);
    expect(config.baseUrl).toContain("localhost");
  });

  it("throws for empty route list", async () => {
    await expect(
      resolveCaptureConfig({
        rootDir: process.cwd(),
        inline: { routes: [] },
      })
    ).rejects.toThrow("routes must contain at least one route");
  });

  it("loads from config file", async () => {
    const config = await resolveCaptureConfig({
      rootDir: process.cwd(),
      configPath: "../../apps/demo/ghostframe.capture.config.mjs",
    });

    expect(config.routes.length).toBeGreaterThan(0);
    expect(config.baseUrl).toBe("http://localhost:3005");
  });
});
