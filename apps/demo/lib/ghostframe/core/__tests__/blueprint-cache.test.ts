import { describe, it, expect, beforeEach } from "vitest";
import { blueprintCache, computeStructuralHash, djb2 } from "../blueprint-cache";
import type { Blueprint } from "../types";

describe("djb2", () => {
  it("generates a consistent hex hash for a string", () => {
    const h1 = djb2("DIV:0:0|P:0:1");
    const h2 = djb2("DIV:0:0|P:0:1");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]+$/);
  });
});

describe("computeStructuralHash", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("yields identical hashes for same structure with different text", () => {
    const root1 = document.createElement("div");
    root1.innerHTML = "<p>Hello</p><span></span>";

    const root2 = document.createElement("div");
    root2.innerHTML = "<p>World</p><span></span>";

    const hash1 = computeStructuralHash(root1);
    const hash2 = computeStructuralHash(root2);

    expect(hash1).toBe(hash2);
  });

  it("yields different hashes for different structures", () => {
    const root1 = document.createElement("div");
    root1.innerHTML = "<p></p>";

    const root2 = document.createElement("div");
    root2.innerHTML = "<p></p><span></span>";

    const hash1 = computeStructuralHash(root1);
    const hash2 = computeStructuralHash(root2);

    expect(hash1).not.toBe(hash2);
  });

  it("detects deep nesting changes", () => {
    const root1 = document.createElement("div"); // DIV:1:0 | P:1:1 | SPAN:0:2
    root1.innerHTML = "<p><span></span></p>";

    const root2 = document.createElement("div"); // DIV:1:0 | P:0:1 (missing span)
    root2.innerHTML = "<p></p>";

    expect(computeStructuralHash(root1)).not.toBe(computeStructuralHash(root2));
  });
});

describe("BlueprintCache", () => {
  const mockBlueprint: Blueprint = {
    version: 1,
    rootWidth: 100,
    rootHeight: 100,
    nodes: [],
    generatedAt: Date.now(),
    source: "dynamic",
  };

  it("stores and retrieves by hash", () => {
    const el = document.createElement("div");
    const hash = "abc";

    blueprintCache.set(el, mockBlueprint, hash);
    expect(blueprintCache.get(el, hash)).toBe(mockBlueprint);

    // Mismatched hash returns null
    expect(blueprintCache.get(el, "def")).toBeNull();
  });

  it("invalidates an entry", () => {
    const el = document.createElement("div");
    const hash = "abc";

    blueprintCache.set(el, mockBlueprint, hash);
    blueprintCache.invalidate(el);

    expect(blueprintCache.get(el, hash)).toBeNull();
  });
});
