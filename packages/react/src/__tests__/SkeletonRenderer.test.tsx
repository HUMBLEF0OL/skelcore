import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonRenderer } from "../SkeletonRenderer";
import { DEFAULT_CONFIG, type Blueprint } from "@ghostframe/core";

const mockBlueprint: Blueprint = {
  version: 1,
  rootWidth: 500,
  rootHeight: 300,
  nodes: [
    {
      id: "node-1",
      role: "text",
      tagName: "P",
      width: 480,
      height: 48,
      top: 10,
      left: 10,
      borderRadius: "4px",
      layout: {},
      text: { lines: 2, lineHeight: 24, lastLineWidthRatio: 0.7 },
      children: [],
    },
    {
      id: "node-2",
      role: "image",
      tagName: "IMG",
      width: 100,
      height: 100,
      top: 70,
      left: 10,
      borderRadius: "8px",
      layout: {},
      children: [],
    },
    {
      id: "node-3",
      role: "avatar",
      tagName: "IMG",
      width: 56,
      height: 56,
      top: 180,
      left: 10,
      borderRadius: "50%",
      layout: {},
      children: [],
    },
  ],
  generatedAt: Date.now(),
  source: "dynamic",
};

describe("SkeletonRenderer", () => {
  it("renders a root container with correct dimensions", () => {
    const { container } = render(
      <SkeletonRenderer blueprint={mockBlueprint} config={DEFAULT_CONFIG} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("skel-renderer-root");
    expect(root.style.width).toBe("100%");
    expect(root.style.height).toBe("300px");
  });

  it("renders text nodes as multiple bars", () => {
    const { container } = render(
      <SkeletonRenderer blueprint={mockBlueprint} config={DEFAULT_CONFIG} />
    );
    const textGroup = container.querySelector(".skel-text-group");
    expect(textGroup).not.toBeNull();

    const lines = textGroup?.querySelectorAll(".skel-block");
    expect(lines).toHaveLength(2);

    // Check last line width ratio
    const lastLine = lines?.[1] as HTMLElement;
    expect(lastLine.style.width).toBe("70%");
  });

  it("renders atomic blocks with correct roles", () => {
    const { container } = render(
      <SkeletonRenderer blueprint={mockBlueprint} config={DEFAULT_CONFIG} />
    );
    const imageNode = container.querySelector(".skel-role-image");
    expect(imageNode).not.toBeNull();
    expect(imageNode).toHaveClass("skel-block");
  });

  it("supports absolute positioning mode by default", () => {
    const { container } = render(
      <SkeletonRenderer blueprint={mockBlueprint} config={DEFAULT_CONFIG} />
    );
    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    expect(imageNode.style.position).toBe("absolute");
    expect(imageNode.style.top).toBe("70px");
    expect(imageNode.style.left).toBe("10px");
  });

  it("applies configured radius to regular blocks and preserves avatar circles", () => {
    const config = {
      ...DEFAULT_CONFIG,
      borderRadius: 24,
    };

    const { container } = render(<SkeletonRenderer blueprint={mockBlueprint} config={config} />);

    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    const avatarNode = container.querySelector(".skel-role-avatar") as HTMLElement;

    expect(imageNode.style.borderRadius).toBe("24px");
    expect(avatarNode.style.borderRadius).toBe("50%");
  });

  it("renders table cells as inset bars instead of full-cell masks", () => {
    const tableBlueprint: Blueprint = {
      version: 1,
      rootWidth: 400,
      rootHeight: 80,
      nodes: [
        {
          id: "cell-1",
          role: "table-cell",
          tagName: "TD",
          width: 180,
          height: 36,
          top: 10,
          left: 10,
          borderRadius: "0px",
          layout: {},
          text: { lines: 1, lineHeight: 20, lastLineWidthRatio: 0.7 },
          children: [],
        },
      ],
      generatedAt: Date.now(),
      source: "dynamic",
    };

    const { container } = render(
      <SkeletonRenderer blueprint={tableBlueprint} config={DEFAULT_CONFIG} />
    );

    const cell = container.querySelector(".skel-table-cell") as HTMLElement;
    const bar = container.querySelector(".skel-table-cell-bar") as HTMLElement;

    expect(cell).not.toBeNull();
    expect(bar).not.toBeNull();
    expect(bar.style.width).toBe("70%");
    expect(container.querySelector(".skel-role-table-cell")).toBeNull();
  });

  it("applies custom table-cell config for inset and bar sizing", () => {
    const tableBlueprint: Blueprint = {
      version: 1,
      rootWidth: 400,
      rootHeight: 80,
      nodes: [
        {
          id: "cell-2",
          role: "table-cell",
          tagName: "TD",
          width: 180,
          height: 40,
          top: 10,
          left: 10,
          borderRadius: "0px",
          layout: {},
          children: [],
        },
      ],
      generatedAt: Date.now(),
      source: "dynamic",
    };

    const config = {
      ...DEFAULT_CONFIG,
      tableCellInsetX: 12,
      tableCellBarHeightRatio: 0.5,
      tableCellBarMinHeight: 10,
      tableCellDefaultWidthRatio: 0.6,
    };

    const { container } = render(<SkeletonRenderer blueprint={tableBlueprint} config={config} />);

    const cell = container.querySelector(".skel-table-cell") as HTMLElement;
    const bar = container.querySelector(".skel-table-cell-bar") as HTMLElement;

    expect(cell.style.paddingInline).toBe("12px");
    expect(bar.style.width).toBe("60%");
    expect(bar.style.height).toBe("12px");
  });

  it("preserves node borderRadius for non-avatar nodes in flow mode with static blueprints", () => {
    const config = {
      ...DEFAULT_CONFIG,
      borderRadius: 24,
    };

    const staticBlueprint: Blueprint = {
      ...mockBlueprint,
      source: "static",
    };

    const { container } = render(
      <SkeletonRenderer blueprint={staticBlueprint} config={config} mode="flow" />
    );

    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    const avatarNode = container.querySelector(".skel-role-avatar") as HTMLElement;

    expect(imageNode.style.borderRadius).toBe("8px");
    expect(avatarNode.style.borderRadius).toBe("50%");
  });

  it("applies node width and height in flow mode", () => {
    const staticBlueprint: Blueprint = {
      ...mockBlueprint,
      source: "static",
    };

    const { container } = render(
      <SkeletonRenderer blueprint={staticBlueprint} config={DEFAULT_CONFIG} mode="flow" />
    );

    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    expect(imageNode.style.position).toBe("relative");
    expect(imageNode.style.width).toBe("100px");
    expect(imageNode.style.height).toBe("100px");
  });

  it("uses fluid sizing for static text groups in flow mode", () => {
    const staticBlueprint: Blueprint = {
      ...mockBlueprint,
      source: "static",
    };

    const { container } = render(
      <SkeletonRenderer blueprint={staticBlueprint} config={DEFAULT_CONFIG} mode="flow" />
    );

    const textGroup = container.querySelector(".skel-text-group") as HTMLElement;
    expect(textGroup.style.width).toBe("100%");
    expect(textGroup.style.height).toBe("auto");
  });

  it("uses custom animation definitions from registry before built-in presets", () => {
    const { container } = render(
      <SkeletonRenderer
        blueprint={mockBlueprint}
        config={DEFAULT_CONFIG}
        animationPreset="brandPulse"
        animationRegistry={{
          brandPulse: {
            className: "brand-pulse",
            inlineStyle: { opacity: 0.9 },
            keyframes: "0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; }",
            durationMs: 900,
          },
        }}
      />
    );

    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    expect(imageNode.className.includes("brand-pulse")).toBe(true);
    expect(imageNode.style.animationName).toContain("skel-custom-brandpulse");
    expect(imageNode.style.animationDuration).toBe("900ms");
  });

  it("falls back to no animation when animationPreset is unknown", () => {
    const { container } = render(
      <SkeletonRenderer
        blueprint={mockBlueprint}
        config={DEFAULT_CONFIG}
        animationPreset="unknown"
      />
    );

    const imageNode = container.querySelector(".skel-role-image") as HTMLElement;
    expect(imageNode.className.includes("skel-shimmer")).toBe(false);
    expect(imageNode.className.includes("skel-pulse")).toBe(false);
    expect(imageNode.style.animationName).toBe("");
  });
});
