import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonRenderer } from "../SkeletonRenderer";
import { DEFAULT_CONFIG, type Blueprint } from "@ghostframe/ghostframe/runtime";

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
    expect(root.style.width).toBe("500px");
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
});
