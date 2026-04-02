import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import * as core from "@skelcore/core";
import { AutoSkeleton } from "../AutoSkeleton.js";

describe("AutoSkeleton structural hash reuse", () => {
  it("reuses the last structural hash on repeated loading cycles", async () => {
    const generatedBlueprint = {
      version: 1,
      rootWidth: 120,
      rootHeight: 48,
      nodes: [],
      generatedAt: 1,
      source: "dynamic" as const,
    };

    let cachedEntry: { element: Element; hash: string; blueprint: core.Blueprint } | null = null;

    const getSpy = vi.spyOn(core.blueprintCache, "get").mockImplementation((element, hash) => {
      return cachedEntry && cachedEntry.element === element && cachedEntry.hash === hash ? cachedEntry.blueprint : null;
    });
    const setSpy = vi.spyOn(core.blueprintCache, "set").mockImplementation((element, blueprint, hash) => {
      cachedEntry = { element, blueprint, hash };
    });
    const generateSpy = vi
      .spyOn(core, "generateDynamicBlueprint")
      .mockResolvedValue({ ...generatedBlueprint, structuralHash: "hash-1" } as core.Blueprint & {
        structuralHash: string;
      });
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

    await waitFor(() => expect(getSpy).toHaveBeenLastCalledWith(expect.any(HTMLElement), "hash-1"));

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(structuralHashSpy).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledTimes(1);
  });
});