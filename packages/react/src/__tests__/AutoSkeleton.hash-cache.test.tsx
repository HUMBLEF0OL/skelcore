import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import * as core from "@ghostframe/core";
import { AutoSkeleton } from "../AutoSkeleton.js";

describe("AutoSkeleton structural hash reuse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not cache when structuralHash is missing", async () => {
    const generatedBlueprint: core.Blueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    };

    const getSpy = vi.spyOn(core.blueprintCache, "get");
    const setSpy = vi.spyOn(core.blueprintCache, "set");
    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue(generatedBlueprint);

    const { rerender } = render(
      <AutoSkeleton loading={true}>
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));

    rerender(
      <AutoSkeleton loading={false}>
        <div>Content</div>
      </AutoSkeleton>
    );

    rerender(
      <AutoSkeleton loading={true}>
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(2));

    expect(setSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("reuses the last structural hash on repeated loading cycles", async () => {
    const getSpy = vi.spyOn(core.blueprintCache, "get");
    const setSpy = vi.spyOn(core.blueprintCache, "set");
    const generateSpy = vi.spyOn(core, "generateDynamicBlueprint");
    const structuralHashSpy = vi.spyOn(core, "computeStructuralHash");

    const { rerender } = render(
      <AutoSkeleton loading={true}>
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));

    rerender(
      <AutoSkeleton loading={false}>
        <div>Content</div>
      </AutoSkeleton>
    );

    rerender(
      <AutoSkeleton loading={true}>
        <div>Content</div>
      </AutoSkeleton>
    );

    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith(expect.any(HTMLElement), expect.any(String))
    );

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(structuralHashSpy).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledTimes(1);

    const hashArg = setSpy.mock.calls[0]?.[2];
    expect(typeof hashArg).toBe("string");
    expect(hashArg.length).toBeGreaterThan(0);
  });
});
