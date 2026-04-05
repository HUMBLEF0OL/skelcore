import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import { AutoSkeleton } from "../AutoSkeleton.js";

describe("AutoSkeleton A11y & SSR", () => {
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

  it("applies aria-busy to the container while loading", () => {
    const { container } = render(
      <AutoSkeleton
        loading={true}
        blueprint={{
          version: 1,
          rootWidth: 100,
          rootHeight: 20,
          nodes: [],
          generatedAt: 0,
          source: "static",
        }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("applies aria-hidden to the overlay", () => {
    const { container } = render(
      <AutoSkeleton
        loading={true}
        blueprint={{
          version: 1,
          rootWidth: 0,
          rootHeight: 0,
          nodes: [],
          generatedAt: 0,
          source: "static",
        }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    const overlay = container.querySelector(".skel-overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
  });

  it("renders fallback while measuring if no blueprint is present", () => {
    const { getByTestId } = render(
      <AutoSkeleton loading={true} fallback={<div data-testid="fallback">Spinner</div>}>
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(getByTestId("fallback")).toBeInTheDocument();
  });

  it("skips fallback if externalBlueprint is provided", () => {
    const { queryByTestId } = render(
      <AutoSkeleton
        loading={true}
        fallback={<div data-testid="fallback">Spinner</div>}
        blueprint={{
          version: 1,
          rootWidth: 100,
          rootHeight: 100,
          nodes: [],
          generatedAt: 0,
          source: "static",
        }}
      >
        <div>Content</div>
      </AutoSkeleton>
    );

    expect(queryByTestId("fallback")).not.toBeInTheDocument();
  });
});
