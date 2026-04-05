import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import * as core from "@ghostframe/core";
import { asStructuralHash, type Blueprint, type BlueprintManifest } from "@ghostframe/core";
import { AutoSkeleton } from "../AutoSkeleton.js";

// Mock implementation of Blueprint/Measurement
// Since we are in happy-dom, generateDynamicBlueprint will work but might return empty
// if elements have 0 dimensions. For unit testing AutoSkeleton, we'll verify the status/visible layers.

describe("AutoSkeleton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const staticBlueprint: Blueprint = {
    version: 1,
    rootWidth: 100,
    rootHeight: 20,
    nodes: [
      {
        id: "text-1",
        role: "text",
        tagName: "SPAN",
        width: 80,
        height: 12,
        top: 4,
        left: 4,
        borderRadius: "4px",
        layout: {},
        text: {
          lines: 1,
          lineHeight: 12,
          lastLineWidthRatio: 1,
        },
        children: [],
      },
    ],
    generatedAt: Date.now(),
    source: "static" as const,
  };

  const shadowManifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: { builtAt: Date.now(), appVersion: "1.0.0" },
    defaults: { ttlMs: 86400000 },
    entries: {
      "card-1": {
        key: "card-1",
        blueprint: staticBlueprint,
        structuralHash: asStructuralHash("shadow_hash"),
        generatedAt: Date.now(),
        ttlMs: 86400000,
        quality: { confidence: 0.95, warnings: [] },
      },
    },
  };

  it("renders children when not loading", () => {
    const { getByText } = render(
      <AutoSkeleton loading={false}>
        <div data-testid="content">Loaded Content</div>
      </AutoSkeleton>
    );

    expect(getByText("Loaded Content")).toBeInTheDocument();
  });

  it("keeps content visible while measuring before blueprint is ready", async () => {
    const { getByTestId } = render(
      <AutoSkeleton loading={true}>
        <div data-testid="content">Secret Content</div>
      </AutoSkeleton>
    );

    const content = getByTestId("content").parentElement as HTMLElement;
    expect(content.style.visibility).toBe("visible");
    expect(content.style.pointerEvents).toBe("auto");
  });

  it("keeps content hidden while skeleton overlay is active", () => {
    const { container, getByTestId } = render(
      <AutoSkeleton loading={true} blueprint={staticBlueprint}>
        <div data-testid="content">Secret Content</div>
      </AutoSkeleton>
    );

    const content = getByTestId("content").parentElement as HTMLElement;
    expect(content.style.visibility).toBe("hidden");
    expect(content.style.pointerEvents).toBe("none");
    expect(container.querySelector(".skel-overlay")).toBeTruthy();
  });

  it("transitions to exiting and then idle when loading stops", async () => {
    const { rerender, getByTestId } = render(
      <AutoSkeleton loading={true}>
        <div data-testid="content">Content</div>
      </AutoSkeleton>
    );

    // Stop loading
    rerender(
      <AutoSkeleton loading={false}>
        <div data-testid="content">Content</div>
      </AutoSkeleton>
    );

    const content = getByTestId("content").parentElement as HTMLElement;
    // Should be visible now (or starting to fade in)
    expect(content.style.visibility).toBe("visible");

    // Check if it unmounts overlay after timeout
    act(() => {
      vi.runAllTimers();
    });
    // The overlay should be gone (verified by checking internal state/phase if possible)
    // Here we just verify content is still visible
    expect(content.style.visibility).toBe("visible");
  });

  it("emits resolution event when loading starts", () => {
    const onResolution = vi.fn();

    render(
      <AutoSkeleton
        loading={true}
        onResolution={onResolution}
        skeletonKey="card-1"
        blueprint={staticBlueprint}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(onResolution).toHaveBeenCalled();
    expect(onResolution.mock.calls[0][0].source).toBeDefined();
  });

  it("emits shadow telemetry and keeps dynamic source in hybrid shadow mode", () => {
    const onResolution = vi.fn();

    render(
      <AutoSkeleton
        loading={true}
        skeletonKey="card-1"
        manifest={shadowManifest}
        policyOverride={{ mode: "hybrid", shadowTelemetryOnly: true }}
        onResolution={onResolution}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(onResolution).toHaveBeenCalled();

    const event = onResolution.mock.calls[0][0];
    expect(event.source).toBe("dynamic");
    expect(event.reason).toBe("shadow-hit");
    expect(event.candidateSource).toBe("manifest");
  });

  it("emits measurement duration after dynamic fallback completes", async () => {
    const measuredBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 24,
      nodes: [],
      generatedAt: Date.now(),
      source: "dynamic",
    };
    vi.spyOn(core, "generateDynamicBlueprint").mockResolvedValue(measuredBlueprint);
    const onResolution = vi.fn();

    render(
      <AutoSkeleton loading={true} skeletonKey="dynamic-card" onResolution={onResolution}>
        <div>Content</div>
      </AutoSkeleton>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(onResolution).toHaveBeenCalled();
    const measuredEvent = onResolution.mock.calls
      .map((call) => call[0])
      .find((event) => event.reason === "dynamic-measured");

    expect(measuredEvent).toBeDefined();
    expect(measuredEvent.source).toBe("dynamic");
    expect(measuredEvent.componentKey).toBe("dynamic-card");
    expect(measuredEvent.measurementDurationMs).toBeGreaterThanOrEqual(0);
  });
});
