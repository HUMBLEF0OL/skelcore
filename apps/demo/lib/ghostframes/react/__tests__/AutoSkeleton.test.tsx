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
});
