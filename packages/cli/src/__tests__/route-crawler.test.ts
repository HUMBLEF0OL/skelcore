import { describe, expect, it, vi } from "vitest";
import { asStructuralHash, type ManifestEntry } from "@ghostframe/core";
import { crawlRoutes } from "../capture/route-crawler";
import { discoverTargets } from "../capture/target-discovery";
import { extractArtifact } from "../capture/blueprint-extractor";

vi.mock("../capture/target-discovery", () => ({
  discoverTargets: vi.fn(),
}));

vi.mock("../capture/blueprint-extractor", () => ({
  extractArtifact: vi.fn(),
}));

const mockedDiscoverTargets = vi.mocked(discoverTargets);
const mockedExtractArtifact = vi.mocked(extractArtifact);

function makeContext() {
  const page = {
    setViewportSize: vi.fn().mockResolvedValue(undefined),
    goto: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const context = {
    newPage: vi.fn().mockResolvedValue(page),
  };

  return { context, page };
}

describe("crawlRoutes", () => {
  it("fails when route has zero keyed targets", async () => {
    const { context } = makeContext();
    mockedDiscoverTargets.mockResolvedValue([]);

    await expect(
      crawlRoutes(context as never, {
        baseUrl: "http://localhost:3005",
        routes: ["/test"],
        breakpoints: [375],
        viewportHeight: 900,
        outputDir: "apps/demo/lib/ghostframe/generated",
        manifestFileName: "manifest.json",
        loaderFileName: "manifest-loader.ts",
        selector: "[data-skeleton-key]",
        waitForMs: 0,
        retries: 0,
      })
    ).rejects.toThrow("No keyed targets discovered for route: /test");
  });

  it("emits artifacts when keyed targets are found", async () => {
    const { context } = makeContext();
    mockedDiscoverTargets.mockResolvedValue([
      {
        key: "ProductCard",
        selector: '[data-skeleton-key="ProductCard"]',
      },
    ]);

    const entry: ManifestEntry = {
      key: "ProductCard",
      blueprint: {
        version: 1,
        rootWidth: 300,
        rootHeight: 200,
        nodes: [],
        generatedAt: Date.now(),
        source: "dynamic",
      },
      structuralHash: asStructuralHash("ProductCard:300x200"),
      generatedAt: Date.now(),
      ttlMs: 86_400_000,
      quality: {
        confidence: 0.5,
        warnings: [],
      },
    };

    mockedExtractArtifact.mockResolvedValue({
      key: "ProductCard",
      entry,
    });

    const result = await crawlRoutes(context as never, {
      baseUrl: "http://localhost:3005",
      routes: ["/test"],
      breakpoints: [375],
      viewportHeight: 900,
      outputDir: "apps/demo/lib/ghostframe/generated",
      manifestFileName: "manifest.json",
      loaderFileName: "manifest-loader.ts",
      selector: "[data-skeleton-key]",
      waitForMs: 0,
      retries: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("ProductCard");
  });

  it("reuses one page per route across breakpoints", async () => {
    const { context } = makeContext();
    mockedDiscoverTargets.mockResolvedValue([
      {
        key: "ProductCard",
        selector: '[data-skeleton-key="ProductCard"]',
      },
    ]);
    mockedExtractArtifact.mockResolvedValue(null);

    await expect(
      crawlRoutes(context as never, {
        baseUrl: "http://localhost:3005",
        routes: ["/test", "/reference"],
        breakpoints: [375, 768, 1280],
        viewportHeight: 900,
        outputDir: "apps/demo/lib/ghostframe/generated",
        manifestFileName: "manifest.json",
        loaderFileName: "manifest-loader.ts",
        selector: "[data-skeleton-key]",
        waitForMs: 0,
        retries: 0,
      })
    ).resolves.toBeDefined();

    expect(context.newPage).toHaveBeenCalledTimes(2);
  });
});
