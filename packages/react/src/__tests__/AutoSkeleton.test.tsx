import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import { AutoSkeleton } from "../AutoSkeleton.js";

// Mock implementation of Blueprint/Measurement
// Since we are in happy-dom, generateDynamicBlueprint will work but might return empty
// if elements have 0 dimensions. For unit testing AutoSkeleton, we'll verify the status/visible layers.

describe("AutoSkeleton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const staticBlueprint = {
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

  it("hides content and shows measuring state when loading starts", async () => {
    const { getByTestId } = render(
      <AutoSkeleton loading={true}>
        <div data-testid="content">Secret Content</div>
      </AutoSkeleton>
    );

    const content = getByTestId("content").parentElement as HTMLElement;
    expect(content.style.opacity).toBe("0");
  });

  it("keeps content hidden while skeleton overlay is active", () => {
    const { container, getByTestId } = render(
      <AutoSkeleton loading={true} blueprint={staticBlueprint}>
        <div data-testid="content">Secret Content</div>
      </AutoSkeleton>
    );

    const content = getByTestId("content").parentElement as HTMLElement;
    expect(content.style.visibility).toBe("hidden");
    expect(content.style.opacity).toBe("0");
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
    expect(content.style.opacity).toBe("1");

    // Check if it unmounts overlay after timeout
    act(() => {
      vi.runAllTimers();
    });
    // The overlay should be gone (verified by checking internal state/phase if possible)
    // Here we just verify content is still 1
    expect(content.style.opacity).toBe("1");
  });
});
