import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { act } from "react";
import * as core from "@skelcore/core";
import type { Blueprint } from "@skelcore/core";
import { AutoSkeleton } from "../AutoSkeleton.js";

// Mock implementation of Blueprint/Measurement
// Since we are in happy-dom, generateDynamicBlueprint will work but might return empty
// if elements have 0 dimensions. For unit testing AutoSkeleton, we'll verify the status/visible layers.

describe("AutoSkeleton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("applies overlayClassName and overlayStyle to the skeleton overlay", () => {
    const { container } = render(
      <AutoSkeleton
        loading={true}
        blueprint={staticBlueprint}
        overlayClassName="custom-overlay"
        overlayStyle={{ backgroundColor: "rgba(255, 0, 0, 0.1)" }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    const overlay = container.querySelector(".skel-overlay") as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.className.includes("custom-overlay")).toBe(true);
    expect(overlay.style.backgroundColor).toBe("rgba(255, 0, 0, 0.1)");
    expect(overlay.style.position).toBe("absolute");
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("passes include/exclude controls into dynamic analyzer", async () => {
    vi.useRealTimers();

    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    render(
      <AutoSkeleton
        loading={true}
        include={[{ selector: ".keep" }]}
        exclude={[{ selector: ".drop" }]}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
    expect(generateSpy).toHaveBeenCalledWith(expect.any(HTMLElement), expect.any(Object), {
      include: [{ selector: ".keep" }],
      exclude: [{ selector: ".drop" }],
    });
  });

  it("uses auto placeholder strategy via dynamic analyzer", async () => {
    vi.useRealTimers();

    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    render(
      <AutoSkeleton loading={true} placeholderStrategy="auto">
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
  });

  it("uses schema strategy without dynamic measurement", () => {
    const generateSpy = vi.spyOn(core, "generateDynamicBlueprint");

    const { container } = render(
      <AutoSkeleton
        loading={true}
        placeholderStrategy="schema"
        placeholderSchema={{
          blocks: [
            {
              role: "text",
              width: 200,
              height: 16,
              repeat: 2,
            },
          ],
        }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(generateSpy).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".skel-text-group")).toHaveLength(2);
  });

  it("uses slot strategy with placeholder slots and skips analyzer", () => {
    const generateSpy = vi.spyOn(core, "generateDynamicBlueprint");

    const { getByTestId } = render(
      <AutoSkeleton
        loading={true}
        placeholderStrategy="slots"
        placeholderSlots={{
          title: () => <div data-testid="slot-title">Slot title</div>,
        }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(generateSpy).not.toHaveBeenCalled();
    expect(getByTestId("slot-title")).toBeInTheDocument();
  });

  it("falls back to analyzer when schema strategy input is invalid", async () => {
    vi.useRealTimers();

    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    render(
      <AutoSkeleton
        loading={true}
        placeholderStrategy="schema"
        placeholderSchema={
          { blocks: [{ role: "text", width: 0, height: 20 }] } as unknown as core.PlaceholderSchema
        }
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
  });

  it("skips the first measurement when a hydrated blueprint is valid", async () => {
    vi.useRealTimers();

    const hydrateRoot = document.createElement("div");
    const hydrateContent = document.createElement("div");
    const hydrateWrapper = document.createElement("div");
    const hydrateChild = document.createElement("div");
    hydrateWrapper.appendChild(hydrateChild);
    hydrateContent.appendChild(hydrateWrapper);
    hydrateRoot.appendChild(hydrateContent);

    const hydratedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      structuralHash: core.computeStructuralHash(hydrateRoot),
      generatedAt: 1,
      source: "static",
    };

    const generateSpy = vi.spyOn(core, "generateDynamicBlueprint");

    const { container } = render(
      <AutoSkeleton loading={true} blueprintSource="server" hydrateBlueprint={hydratedBlueprint}>
        <div>
          <div>Hydrated content</div>
        </div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(container.querySelector(".skel-overlay")).toBeTruthy());
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("invalidates a stale hydrated blueprint before measuring again", async () => {
    vi.useRealTimers();

    const invalidated = vi.fn();
    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    const staleHydratedBlueprint: Blueprint = {
      version: 99,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      structuralHash: "stale-hash",
      generatedAt: 1,
      source: "static",
    };

    render(
      <AutoSkeleton
        loading={true}
        blueprintSource="server"
        hydrateBlueprint={staleHydratedBlueprint}
        onBlueprintInvalidated={invalidated}
      >
        <div>
          <div>Hydrated content</div>
        </div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
    expect(invalidated).toHaveBeenCalledWith("version-mismatch");
    expect(invalidated.mock.invocationCallOrder[0]).toBeLessThan(
      generateSpy.mock.invocationCallOrder[0]
    );
  });

  it("defers analyzer work when measurementPolicy is idle", async () => {
    vi.useRealTimers();

    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    render(
      <AutoSkeleton loading={true} measurementPolicy={{ mode: "idle" }}>
        <div>Idle policy content</div>
      </AutoSkeleton>
    );

    expect(generateSpy).not.toHaveBeenCalled();

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
  });

  it("waits for viewport intersection when measurementPolicy is viewport", async () => {
    vi.useRealTimers();

    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    const observerState: {
      callback?: (entries: IntersectionObserverEntry[]) => void;
    } = {};
    class MockIntersectionObserver {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        observerState.callback = callback;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "0px";
      thresholds = [0];
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(
      <AutoSkeleton loading={true} measurementPolicy={{ mode: "viewport" }}>
        <div>Viewport policy content</div>
      </AutoSkeleton>
    );

    expect(generateSpy).not.toHaveBeenCalled();
    expect(observerState.callback).toBeTruthy();

    observerState.callback?.([{ isIntersecting: true } as IntersectionObserverEntry]);

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
  });

  it("keeps measuring paused in manual mode until explicitly triggered", async () => {
    vi.useFakeTimers();

    const generateSpy = vi.spyOn(core, "generateDynamicBlueprint");

    render(
      <AutoSkeleton loading={true} measurementPolicy={{ mode: "manual" }}>
        <div>Manual policy content</div>
      </AutoSkeleton>
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("invalidates hydrated blueprint when cache policy version mismatches", async () => {
    vi.useRealTimers();

    const invalidated = vi.fn();
    const generatedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    const hydratedBlueprint: Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      structuralHash: "hash",
      generatedAt: 1,
      source: "static",
    };

    render(
      <AutoSkeleton
        loading={true}
        blueprintSource="server"
        hydrateBlueprint={hydratedBlueprint}
        blueprintCachePolicy={{ version: 2 }}
        onBlueprintInvalidated={invalidated}
      >
        <div>Cache policy mismatch</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
    expect(invalidated).toHaveBeenCalledWith("version-mismatch");
  });
});
