import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AnimationSystem } from "../animation-system.js";
import { DEFAULT_CONFIG } from "../types.js";

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

  it("contains required keyframes and classes (shimmer mode by default)", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    // DEFAULT_CONFIG uses animation: "shimmer"
    expect(content).toContain("@keyframes skel-shimmer");
    expect(content).not.toContain("@keyframes skel-pulse"); // only shimmer in default mode
    expect(content).toContain(".skel-block");
    expect(content).toContain(".skel-shimmer");
    expect(content).toContain(".skel-pulse");
  });

  it("restores visibility for data-skeleton-ignore and data-no-skeleton children", () => {
    animationSystem.injectStyles(DEFAULT_CONFIG);
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    expect(content).toContain("[data-no-skeleton]");
    expect(content).toContain("[data-skeleton-ignore]");
    expect(content).toContain("z-index: 11");
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

  it("respects animation mode 'none' and does not emit keyframes", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, animation: "none" });
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    // Should not contain animated keyframes
    expect(content).not.toContain("@keyframes skel-shimmer");
    expect(content).not.toContain("@keyframes skel-pulse");
    // Should still have static fallback styles (no animation property with values)
    expect(content).toContain(".skel-shimmer");
    expect(content).toContain(".skel-pulse");
    // Verify no animation properties on the classes (excluding prefers-reduced-motion)
    const shimmerSection = content.split(".skel-shimmer")[1]?.split(".skel-pulse")[0] || "";
    expect(shimmerSection).not.toContain("animation: skel-");
  });

  it("respects animation mode 'shimmer' and only emits shimmer keyframes", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, animation: "shimmer" });
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    expect(content).toContain("@keyframes skel-shimmer");
    expect(content).not.toContain("@keyframes skel-pulse");
    expect(content).toContain("animation: skel-shimmer");
    expect(content).not.toContain("animation: skel-pulse");
  });

  it("respects animation mode 'pulse' and only emits pulse keyframes", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, animation: "pulse" });
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    expect(content).not.toContain("@keyframes skel-shimmer");
    expect(content).toContain("@keyframes skel-pulse");
    expect(content).not.toContain("animation: skel-shimmer");
    expect(content).toContain("animation: skel-pulse");
  });

  it("clamps speed to minimum safe value (0.1) to prevent division by zero", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, speed: 0 });
    const styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const content = styleTag.textContent || "";

    // With clamped speed of 0.1, shimmerDuration = 2/0.1 = 20s
    expect(content).toContain("skel-shimmer 20s");
  });

  it("handles extreme speed values correctly", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, speed: 0.5 });
    let content = document.getElementById("ghostframe-animations")?.textContent || "";
    // shimmerDuration = 2/0.5 = 4s
    expect(content).toContain("skel-shimmer 4s");

    animationSystem.injectStyles({ ...DEFAULT_CONFIG, speed: 10 });
    content = document.getElementById("ghostframe-animations")?.textContent || "";
    // shimmerDuration = 2/10 = 0.2s
    expect(content).toContain("skel-shimmer 0.2s");
  });

  it("updates config hash when animation mode changes (triggers re-render)", () => {
    animationSystem.injectStyles({ ...DEFAULT_CONFIG, animation: "shimmer" });
    let styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const contentShimmer = styleTag.textContent;

    animationSystem.injectStyles({ ...DEFAULT_CONFIG, animation: "pulse" });
    styleTag = document.getElementById("ghostframe-animations") as HTMLStyleElement;
    const contentPulse = styleTag.textContent;

    // Verify that changing animation mode actually re-renders CSS
    expect(contentShimmer).not.toBe(contentPulse);
    expect(contentPulse).toContain("@keyframes skel-pulse");
  });
});
