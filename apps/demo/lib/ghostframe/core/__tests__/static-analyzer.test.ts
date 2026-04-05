import { describe, it, expect } from "vitest";
import { generateStaticBlueprint, STATIC_DEFAULTS } from "../static-analyzer";
import type { VNode } from "../static-analyzer";

// ─── VDOM Helper ───────────────────────────────────────────────────────────────
function h(type: unknown, props: Record<string, unknown> = {}, ...children: unknown[]): VNode {
  return {
    type,
    props: {
      ...props,
      ...(children.length > 0 ? { children: children.length === 1 ? children[0] : children } : {}),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("generateStaticBlueprint", () => {
  it("maps simple tags to roles with defaults", () => {
    const input = h("img");
    const bp = generateStaticBlueprint(input);

    expect(bp.source).toBe("static");
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].role).toBe("image");
    expect(bp.nodes[0].width).toBe(STATIC_DEFAULTS.image.width);
    expect(bp.nodes[0].height).toBe(STATIC_DEFAULTS.image.height);
  });

  it("extracts dimensions from style/props", () => {
    // style prop overriding default
    const input1 = h("button", { style: { width: 400, height: 100 } });
    const bp1 = generateStaticBlueprint(input1);
    expect(bp1.nodes[0].width).toBe(400);
    expect(bp1.nodes[0].height).toBe(100);

    // direct props overlapping
    const input2 = h("img", { width: 50 });
    const bp2 = generateStaticBlueprint(input2);
    expect(bp2.nodes[0].width).toBe(50);
    expect(bp2.nodes[0].height).toBe(STATIC_DEFAULTS.image.height); // default fallback for height
  });

  it("respects data-skeleton-w and data-skeleton-h overrides", () => {
    // These data attrs take absolute priority in the static path
    const input = h("div", {
      "data-skeleton-role": "avatar",
      "data-skeleton-w": "500",
      "data-skeleton-h": "20",
      style: { width: "100" },
    });

    const bp = generateStaticBlueprint(input);
    expect(bp.nodes[0].role).toBe("avatar"); // from role override
    expect(bp.nodes[0].width).toBe(500); // from override
    expect(bp.nodes[0].height).toBe(20);
  });

  it("handles fragment/component unrolling", () => {
    // If the node type is a function (e.g. a React component), it unrolls its children
    const MyComponent = () => null;
    const input = h(MyComponent, {}, h("p"), h("button"));

    const bp = generateStaticBlueprint(input);
    expect(bp.nodes).toHaveLength(2);
    expect(bp.nodes[0].role).toBe("text"); // The P tag
    expect(bp.nodes[1].role).toBe("button"); // The BUTTON tag
  });

  it("discards nodes marked with data-no-skeleton", () => {
    const input = h(
      "div",
      {},
      h("h1"),
      h("span", { "data-no-skeleton": true }, h("p", {}, "hidden text")),
      h("img")
    );

    const bp = generateStaticBlueprint(input);
    // The span and its p child should be completely missing
    expect(bp.nodes).toHaveLength(1); // The div becomes a container holding h1 and img
    expect(bp.nodes[0].role).toBe("container");
    expect(bp.nodes[0].children).toHaveLength(2);
    expect(bp.nodes[0].children[0].role).toBe("text");
    expect(bp.nodes[0].children[1].role).toBe("image");
  });

  it("preserves basic flex layout properties on containers", () => {
    const input = h("div", { style: { display: "flex", gap: "10px", padding: "20px" } }, h("p"));

    const bp = generateStaticBlueprint(input);
    expect(bp.nodes[0].role).toBe("container");
    expect(bp.nodes[0].layout.display).toBe("flex");
    expect(bp.nodes[0].layout.gap).toBe("10px");
    expect(bp.nodes[0].layout.padding).toBe("20px");

    // Child is inside
    expect(bp.nodes[0].children).toHaveLength(1);
    expect(bp.nodes[0].children[0].role).toBe("text");
  });

  it("serialises purely to JSON (no circular refs)", () => {
    const input = h("div", {
      children: [h("p"), h("img"), h(h, {}, h("svg"))], // nested mess
    });

    const bp = generateStaticBlueprint(input);

    // It should survive stringification and parsing without throwing
    const parsed = JSON.parse(JSON.stringify(bp));
    expect(parsed.source).toBe("static");
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0].children).toHaveLength(3); // p, img, and the unrolled function component's svg
  });
});
