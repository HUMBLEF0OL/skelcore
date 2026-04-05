import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDynamicBlueprint } from "../dynamic-analyzer.js";
import { computeStructuralHash } from "../blueprint-cache.js";

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
  it("attaches structuralHash to the returned blueprint", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 400, height: 200, top: 0, left: 0 });

    const child = document.createElement("p");
    child.textContent = "Hello";
    mockLayout(child, { width: 100, height: 24, top: 10, left: 10 });
    root.appendChild(child);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    expect(bp.structuralHash).toBeDefined();
    expect(bp.structuralHash).toBe(computeStructuralHash(root));
  });

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

  it("preserves nested structure when intermediate elements are filtered out", async () => {
    // BUG: When a parent has multiple children, and one is hidden,
    // the depths become misaligned, causing siblings to attach to wrong parents.
    //
    // Structure:
    // root
    //   └─ container
    //       ├─ hidden-section (FILTERED OUT)
    //       └─ visible-paragraph
    //
    // Without fix, paragraph could attach to root instead of container
    // because depth tracking gets corrupted when hidden-section is skipped.

    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const container = document.createElement("div");
    mockLayout(container, { width: 500, height: 400, top: 0, left: 0 });
    root.appendChild(container);

    // This hidden section breaks depth alignment
    const hiddenSection = document.createElement("section");
    hiddenSection.style.display = "none";
    mockLayout(hiddenSection, { width: 500, height: 100, top: 0, left: 0 }, { display: "none" });
    container.appendChild(hiddenSection);

    // This paragraph should still be a child of container, not root
    const paragraph = document.createElement("p");
    paragraph.textContent = "Content";
    mockLayout(paragraph, { width: 400, height: 24, top: 150, left: 10 });
    container.appendChild(paragraph);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    // Verify hierarchy is correct
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].tagName).toBe("DIV");
    expect(bp.nodes[0].children).toHaveLength(1);
    expect(bp.nodes[0].children[0].tagName).toBe("P");
  });

  it("correctly handles multiple nested levels with filtered elements", async () => {
    // More complex scenario: deeply nested structure with multiple filtered points
    // root > article > (hidden) > p
    //             > nav > ul > li (nested three levels)
    const root = document.createElement("div");
    mockLayout(root, { width: 800, height: 600, top: 0, left: 0 });

    const article = document.createElement("article");
    mockLayout(article, { width: 800, height: 600, top: 0, left: 0 });
    root.appendChild(article);

    // Hidden section that should be filtered
    const hidden = document.createElement("section");
    hidden.style.display = "none";
    mockLayout(hidden, { width: 400, height: 100, top: 0, left: 0 }, { display: "none" });
    article.appendChild(hidden);

    // Paragraph after hidden section should be child of article
    const p = document.createElement("p");
    p.textContent = "Article content";
    mockLayout(p, { width: 300, height: 24, top: 150, left: 10 });
    article.appendChild(p);

    // Navigation structure: nav > ul > li (three levels deep)
    const nav = document.createElement("nav");
    mockLayout(nav, { width: 200, height: 300, top: 200, left: 10 });
    article.appendChild(nav);

    const ul = document.createElement("ul");
    mockLayout(ul, { width: 200, height: 300, top: 200, left: 10 });
    nav.appendChild(ul);

    const li = document.createElement("li");
    li.textContent = "Menu item";
    mockLayout(li, { width: 150, height: 20, top: 200, left: 20 });
    ul.appendChild(li);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    // article should be top-level
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].tagName).toBe("ARTICLE");

    // article should have: p, nav (not hidden)
    expect(bp.nodes[0].children.length).toBeGreaterThanOrEqual(2);

    // Find p and nav in children
    const pChild = bp.nodes[0].children.find((c) => c.tagName === "P");
    const navChild = bp.nodes[0].children.find((c) => c.tagName === "NAV");

    expect(pChild).toBeDefined();
    expect(pChild?.role).toBe("text");

    expect(navChild).toBeDefined();
    expect(navChild?.role).toBe("container");
    // nav should have ul
    expect(navChild?.children).toHaveLength(1);
    expect(navChild?.children[0].tagName).toBe("UL");
    // ul should have li
    expect(navChild?.children[0].children).toHaveLength(1);
    expect(navChild?.children[0].children[0].tagName).toBe("LI");
  });

  it("reparents to nearest surviving ancestor when direct parent is filtered", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const container = document.createElement("div");
    mockLayout(container, { width: 500, height: 300, top: 0, left: 0 });
    root.appendChild(container);

    // This parent is collected but filtered in PASS 3 due to fixed positioning.
    const fixedParent = document.createElement("div");
    mockLayout(fixedParent, { width: 300, height: 100, top: 50, left: 10 }, { position: "fixed" });
    container.appendChild(fixedParent);

    // Child remains valid and should attach to container (nearest surviving ancestor), not root.
    const childText = document.createElement("p");
    childText.textContent = "Reparented";
    mockLayout(childText, { width: 120, height: 24, top: 70, left: 20 });
    fixedParent.appendChild(childText);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);

    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].tagName).toBe("DIV");

    const containerChildren = bp.nodes[0].children;
    const pChild = containerChildren.find((c) => c.tagName === "P");

    expect(pChild).toBeDefined();
    expect(pChild?.role).toBe("text");
  });

  it("filters elements with opacity variants (0, 0.0, near-zero)", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    // opacity = "0"
    const img1 = document.createElement("img");
    mockLayout(img1, { width: 100, height: 100 }, { opacity: "0" });
    root.appendChild(img1);

    // opacity = "0.0"
    const img2 = document.createElement("img");
    mockLayout(img2, { width: 100, height: 100 }, { opacity: "0.0" });
    root.appendChild(img2);

    // opacity = "0.00"
    const img3 = document.createElement("img");
    mockLayout(img3, { width: 100, height: 100 }, { opacity: "0.00" });
    root.appendChild(img3);

    // opacity = "0.005" (very close to zero, should still filter)
    const img4 = document.createElement("img");
    mockLayout(img4, { width: 100, height: 100 }, { opacity: "0.005" });
    root.appendChild(img4);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);
    // All opacity-zero/near-zero elements should be filtered out
    expect(bp.nodes).toHaveLength(0);
  });

  it("includes elements with low but visible opacity (>0.01)", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    // opacity = "0.01" (just over threshold, should be included)
    const img = document.createElement("img");
    mockLayout(img, { width: 100, height: 100 }, { opacity: "0.01" });
    root.appendChild(img);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].role).toBe("image");
  });

  it("trims textContent before role inference scoring", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const pill = document.createElement("div");
    pill.textContent = "   ";
    mockLayout(pill, { width: 40, height: 20, top: 10, left: 10 }, { borderRadius: "20px" });
    root.appendChild(pill);

    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root);
    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].role).toBe("text");
  });

  it("supports include and exclude matchers with exclude precedence", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const includedBySelector = document.createElement("p");
    includedBySelector.className = "keep";
    includedBySelector.textContent = "Keep me";
    mockLayout(includedBySelector, { width: 120, height: 24, top: 10, left: 10 });

    const excludedByMatcher = document.createElement("p");
    excludedByMatcher.className = "drop";
    excludedByMatcher.textContent = "Drop me";
    mockLayout(excludedByMatcher, { width: 120, height: 24, top: 40, left: 10 });

    root.appendChild(includedBySelector);
    root.appendChild(excludedByMatcher);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root, undefined, {
      include: [{ role: "text" }],
      exclude: [{ selector: ".drop" }],
    });

    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].tagName).toBe("P");
    expect(bp.nodes[0].left).toBe(10);
    expect(bp.nodes[0].top).toBe(10);
  });

  it("honors data-skeleton-include and data-skeleton-exclude in dynamic analysis", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 500, height: 500, top: 0, left: 0 });

    const includedByAttr = document.createElement("div");
    includedByAttr.setAttribute("data-skeleton-include", "true");
    includedByAttr.textContent = "Included";
    mockLayout(includedByAttr, { width: 100, height: 24, top: 20, left: 20 });

    const excludedByAttr = document.createElement("div");
    excludedByAttr.setAttribute("data-skeleton-include", "true");
    excludedByAttr.setAttribute("data-skeleton-exclude", "true");
    excludedByAttr.textContent = "Excluded";
    mockLayout(excludedByAttr, { width: 100, height: 24, top: 50, left: 20 });

    root.appendChild(includedByAttr);
    root.appendChild(excludedByAttr);
    document.body.appendChild(root);

    const bp = await generateDynamicBlueprint(root, undefined, {
      include: [{ selector: ".not-present" }],
      exclude: [],
    });

    expect(bp.nodes).toHaveLength(1);
    expect(bp.nodes[0].left).toBe(20);
    expect(bp.nodes[0].top).toBe(20);
  });

  it("returns a partial blueprint instead of throwing when measurement budget is exceeded", async () => {
    const root = document.createElement("div");
    mockLayout(root, { width: 900, height: 900, top: 0, left: 0 });

    for (let i = 0; i < 40; i++) {
      const child = document.createElement("p");
      child.textContent = `Item ${i}`;
      mockLayout(child, { width: 120, height: 24, top: i * 10, left: 0 });
      root.appendChild(child);
    }

    document.body.appendChild(root);

    const baseline = await generateDynamicBlueprint(root);

    let nowCall = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      nowCall += 1;
      return nowCall * 2;
    });

    const budgeted = await generateDynamicBlueprint(root, undefined, { budgetMs: 4 });

    expect(budgeted.source).toBe("dynamic");
    expect(budgeted.nodes.length).toBeLessThan(baseline.nodes.length);
    expect(budgeted.nodes.length).toBeGreaterThanOrEqual(0);
  });
});
