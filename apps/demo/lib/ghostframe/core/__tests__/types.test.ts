import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, type SkeletonConfig, type Blueprint, type BlueprintNode } from "../types";

// ─── DEFAULT_CONFIG Tests ─────────────────────────────────────────────────────

describe("DEFAULT_CONFIG", () => {
  it("has all required SkeletonConfig fields", () => {
    const required: (keyof SkeletonConfig)[] = [
      "animation",
      "baseColor",
      "highlightColor",
      "borderRadius",
      "speed",
      "minTextHeight",
      "maxDepth",
      "lastLineRatio",
      "iconMaxSize",
      "minImageArea",
      "transitionDuration",
    ];
    for (const key of required) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it("uses shimmer animation by default", () => {
    expect(DEFAULT_CONFIG.animation).toBe("shimmer");
  });

  it("uses css variable for baseColor", () => {
    expect(DEFAULT_CONFIG.baseColor).toContain("--skeleton-base");
  });

  it("has speed of 1 (no multiplier)", () => {
    expect(DEFAULT_CONFIG.speed).toBe(1);
  });

  it("has maxDepth of 12", () => {
    expect(DEFAULT_CONFIG.maxDepth).toBe(12);
  });

  it("has lastLineRatio between 0 and 1", () => {
    expect(DEFAULT_CONFIG.lastLineRatio).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.lastLineRatio).toBeLessThanOrEqual(1);
  });
});

// ─── Blueprint JSON-Serialisability Tests ─────────────────────────────────────

describe("Blueprint", () => {
  it("is JSON-serialisable (no circular refs, no DOM objects)", () => {
    const node: BlueprintNode = {
      id: "node-1",
      role: "text",
      width: 200,
      height: 16,
      top: 0,
      left: 0,
      layout: {},
      borderRadius: "4px",
      tagName: "P",
      children: [],
    };

    const blueprint: Blueprint = {
      version: 1,
      rootWidth: 800,
      rootHeight: 400,
      nodes: [node],
      generatedAt: Date.now(),
      source: "static",
    };

    expect(() => JSON.stringify(blueprint)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(blueprint)) as Blueprint;
    expect(parsed.nodes[0].role).toBe("text");
    expect(parsed.source).toBe("static");
  });

  it("supports nested children in BlueprintNode", () => {
    const child: BlueprintNode = {
      id: "child-1",
      role: "image",
      width: 100,
      height: 100,
      top: 10,
      left: 10,
      layout: {},
      borderRadius: "0px",
      tagName: "IMG",
      children: [],
    };

    const parent: BlueprintNode = {
      id: "parent-1",
      role: "container",
      width: 300,
      height: 200,
      top: 0,
      left: 0,
      layout: { display: "flex" },
      borderRadius: "0px",
      tagName: "DIV",
      children: [child],
    };

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].id).toBe("child-1");
  });
});
