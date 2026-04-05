import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDynamicBlueprint } from "../dynamic-analyzer";

// ─── DOM Mock Utilities ────────────────────────────────────────────────────────
const styleMocks = new WeakMap<Element, Partial<CSSStyleDeclaration>>();

function mockLayout(
  el: HTMLElement,
  rect: Partial<DOMRect>,
  styles: Partial<CSSStyleDeclaration> = {}
) {
  el.getBoundingClientRect = () =>
    ({
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      right: (rect.left ?? 0) + (rect.width ?? 0),
      bottom: (rect.top ?? 0) + (rect.height ?? 0),
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => {},
    }) as DOMRect;

  if (styles.display) {
    el.style.display = styles.display;
  }

  styleMocks.set(el, {
    width: rect.width !== undefined ? `${rect.width}px` : "auto",
    height: rect.height !== undefined ? `${rect.height}px` : "auto",
    ...styles,
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();

  vi.spyOn(window, "getComputedStyle").mockImplementation((node) => {
    const overrides = styleMocks.get(node) || {};
    return {
      display: "block",
      visibility: "visible",
      position: "static",
      borderRadius: "0px",
      fontSize: "16px",
      lineHeight: "24px",
      backgroundImage: "none",
      objectFit: "fill",
      overflow: "visible",
      width: "auto",
      height: "auto",
      aspectRatio: "auto",
      transform: "none",
      direction: "ltr",
      ...overrides,
    } as unknown as CSSStyleDeclaration;
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("generateDynamicBlueprint", () => {
  it("collects nested elements into a structural Blueprint hierarchy", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const childImage = document.createElement("img");
    mockLayout(childImage, { width: 400, height: 200, top: 10, left: 10 });
    root.appendChild(childImage);

    const childText = document.createElement("p");
    childText.textContent = "Hello World";
    mockLayout(childText, { width: 200, height: 24, top: 220, left: 10 });
    root.appendChild(childText);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    expect(bp.source).toBe("dynamic");
    expect(bp.nodes).toHaveLength(2);

    expect(bp.nodes[0].role).toBe("image");
    expect(bp.nodes[0].tagName).toBe("IMG");
    expect(bp.nodes[0].width).toBe(400);
    expect(bp.nodes[0].height).toBe(200);

    expect(bp.nodes[1].role).toBe("text");
    expect(bp.nodes[1].tagName).toBe("P");
    expect(bp.nodes[1].width).toBe(200);
    expect(bp.nodes[1].height).toBe(24);
  });

  it("calculates accurate text lines based on lineHeight heuristics", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 100, top: 0, left: 0 });

    const multiLineP = document.createElement("p");
    multiLineP.textContent = "Very long text that spans multiple lines here.";
    // 48 height / 16 lineHeight = 3 lines!
    mockLayout(multiLineP, { width: 400, height: 48, top: 0, left: 0 }, { lineHeight: "16px" });
    root.appendChild(multiLineP);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].text?.lines).toBe(3);
    expect(bp.nodes[0].text?.lineHeight).toBe(16);
  });

  it("skips strictly excluded elements (display:none, opacity:0, data-no-skeleton)", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const hidden1 = document.createElement("div");
    hidden1.style.display = "none";
    mockLayout(hidden1, { width: 100, height: 100 }, { display: "none" });

    const invisibleImg = document.createElement("img");
    mockLayout(invisibleImg, { width: 100, height: 100 }, { opacity: "0" });

    const ignoredP = document.createElement("p");
    ignoredP.setAttribute("data-no-skeleton", "true");
    mockLayout(ignoredP, { width: 100, height: 100 });

    root.appendChild(hidden1);
    root.appendChild(invisibleImg);
    root.appendChild(ignoredP);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);
    expect(bp.nodes).toHaveLength(0); // All children skipped
  });

  it("structurally preserves table layout containers while converting inner text", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const table = document.createElement("table");
    mockLayout(table, { width: 400, height: 400, top: 0, left: 0 });

    const tbody = document.createElement("tbody");
    mockLayout(tbody, { width: 400, height: 400, top: 0, left: 0 });

    const tr = document.createElement("tr");
    mockLayout(tr, { width: 400, height: 100, top: 0, left: 0 });

    const td = document.createElement("td");
    mockLayout(td, { width: 100, height: 100, top: 0, left: 0 });

    const textPayload = document.createElement("span");
    textPayload.textContent = "Column 1 data";
    mockLayout(textPayload, { width: 80, height: 20, top: 10, left: 10 });

    td.appendChild(textPayload);
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    root.appendChild(table);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    // Verify outer shell maps to containers/table roles, but inner span maps to text
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].role).toBe("container"); // TABLE
    expect(bp.nodes[0].children[0].role).toBe("container"); // TBODY
    expect(bp.nodes[0].children[0].children[0].role).toBe("table-row"); // TR
    expect(bp.nodes[0].children[0].children[0].children[0].role).toBe("table-cell"); // TD

    const payload = bp.nodes[0].children[0].children[0].children[0].children[0];
    expect(payload.role).toBe("text"); // Inner SPAN
    expect(payload.width).toBe(80);
  });

  it("falls back to layout transforms to correct viewport bounds", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 100, left: 100 });

    // The transformed child
    const shiftedChild = document.createElement("div");
    // Visually it appears relative to viewport due to transform, but offsetParent dictates hierarchy bounds
    shiftedChild.textContent = "Transformed text!"; // text role!
    Object.defineProperty(shiftedChild, "offsetTop", { value: 50 });
    Object.defineProperty(shiftedChild, "offsetLeft", { value: 25 });
    Object.defineProperty(shiftedChild, "offsetParent", { value: root });

    mockLayout(
      shiftedChild,
      { width: 100, height: 50, top: 300, left: 300 }, // Raw DOMRect bounds (skewed)
      { transform: "translateY(50px)" }
    );

    root.appendChild(shiftedChild);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    expect(bp.nodes).toHaveLength(1);
    // Since transform !== 'none', it defaults to the offset parent chain,
    // explicitly resolving to offsetTop=50 instead of relying on the skewed getBoundingClientRect!
    expect(bp.nodes[0].top).toBe(50);
    expect(bp.nodes[0].left).toBe(25);
  });
});
