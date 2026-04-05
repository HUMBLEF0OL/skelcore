import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AnimationSystem } from "../animation-system";
import { DEFAULT_CONFIG } from "../types";

describe("AnimationSystem", () => {
  let animationSystem: AnimationSystem;

  beforeEach(() => {
    animationSystem = new AnimationSystem();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    animationSystem.removeStyles();
  });

  it("injects a style tag into the head", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    const styleTag = document.getElementById("ghostframe-animations");
    expect(styleTag).not.toBeNull();
    expect(styleTag?.tagName).toBe("STYLE");
  });

  it("is idempotent and does not inject multiple tags", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    animationSystem.injectStyles(DEFAULT_CONFIG);
    const tags = document.querySelectorAll("#ghostframe-animations");
    expect(tags).toHaveLength(1);
  });

  it("contains required keyframes and classes", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    expect(content).toContain("@keyframes skel-shimmer");
    expect(content).toContain("@keyframes skel-pulse");
    expect(content).toContain(".skel-block");
    expect(content).toContain(".skel-shimmer");
    expect(content).toContain(".skel-pulse");
  });

  it("updates CSS variables when config changes", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, baseColor: "#ff0000" });
    let content = document.getElementById("ghostframe-animations")?.textContent || "";
    expect(content).toContain("--skel-base: #ff0000");

    animationSystem.injectStyles({ ...DEFAULT_CONFIG, baseColor: "#00ff00" });
    content = document.getElementById("ghostframe-animations")?.textContent || "";
    expect(content).toContain("--skel-base: #00ff00");
  });

  it("removes the style tag on request", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    expect(document.getElementById("ghostframe-animations")).not.toBeNull();

    animationSystem.removeStyles();
    expect(document.getElementById("ghostframe-animations")).toBeNull();
  });
});
