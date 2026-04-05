import { inferRole } from "./role-inferencer";
import type { Blueprint, BlueprintNode, SkeletonConfig, MeasuredNode } from "./types";
import { DEFAULT_CONFIG } from "./types";

type CollectNode = {
  element: HTMLElement;
  depth: number;
};

type ReadResult = {
  element: HTMLElement;
  depth: number;
  rect: DOMRect;
  styles: CSSStyleDeclaration;
  parentIndex: number; // to look up parent rect for clipping
};

export async function generateDynamicBlueprint(
  root: HTMLElement,
  config: SkeletonConfig = DEFAULT_CONFIG
): Promise<Blueprint> {
  // ─── Font Loading ────────────────────────────────────────────────────────────
  // Wait for web fonts to load before measuring text layout
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // ─── PASS 1: COLLECT ─────────────────────────────────────────────────────────
  // No forced layout. We only read the DOM tree structure and attributes.
  const collected: CollectNode[] = [];

  function walk(el: Element, depth: number) {
    if (depth > config.maxDepth) return;

    const htmlEl = el as HTMLElement;

    // Fast inline exclusions to skip subtrees entirely
    if (htmlEl.getAttribute("data-skeleton-ignore") !== null) return;
    if (htmlEl.getAttribute("data-no-skeleton") !== null) return;

    // 'display: none' inline style check (avoids getComputedStyle)
    if (htmlEl.style && htmlEl.style.display === "none") return;

    // Closed <details> omit content
    if (htmlEl.tagName === "DETAILS" && !(htmlEl as HTMLDetailsElement).open) {
      return;
    }

    // Only collect if not target root (we want the children to be the top-level blueprint nodes)
    if (el !== root) {
      collected.push({ element: htmlEl, depth });
    }

    // Stop traversing if it's a Shadow DOM boundary
    if (htmlEl.shadowRoot) return;

    const children = htmlEl.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === 1) {
        walk(child, depth + 1);
      }
    }
  }

  // Virtualized list heuristic: extremely tall scrollHeight compared to children count
  if (root.children.length * 100 < root.scrollHeight && root.scrollHeight > 2000) {
    console.warn("Ghostframe: Potential virtualized list detected. Skeletons bounded by maxDepth.");
  }

  walk(root, 0);

  // ─── PASS 2: READ ────────────────────────────────────────────────────────────
  // Batch layout read. Zero writes occur in this loop. Absolutely no interleaving.
  const reads: ReadResult[] = new Array(collected.length);
  const elementToIndex = new Map<HTMLElement, number>();

  for (let i = 0; i < collected.length; i++) {
    elementToIndex.set(collected[i].element, i);
  }

  for (let i = 0; i < collected.length; i++) {
    const node = collected[i];
    const parentEl = node.element.parentElement;
    const parentIndex = parentEl ? (elementToIndex.get(parentEl) ?? -1) : -1;

    reads[i] = {
      element: node.element,
      depth: node.depth,
      rect: node.element.getBoundingClientRect(),
      styles: window.getComputedStyle(node.element),
      parentIndex,
    };
  }

  // ─── PASS 3: PROCESS ─────────────────────────────────────────────────────────
  // Pure Javascript mapping without DOM interactions.
  const rootRect = root.getBoundingClientRect();
  const rootLeft = rootRect.left;
  const rootTop = rootRect.top;

  let nodeCounter = 0;
  const flatNodes: (BlueprintNode & { parentDepth: number })[] = [];

  for (let i = 0; i < reads.length; i++) {
    const { element: el, rect, styles, depth, parentIndex } = reads[i];

    // Edge-case filtering resolved via CSS
    if (styles.display === "none" || styles.visibility === "hidden")
      continue;
    if (styles.position === "fixed") continue; // Cannot accurately relative-position fixed navbars inside flow
    if (rect.width < 1 || rect.height < 1) continue;

    // Map to normalized struct for inferencer
    const measured: MeasuredNode = {
      tagName: el.tagName.toUpperCase(),
      ariaRole: el.getAttribute("role"),
      classList: Array.from(el.classList),
      dataAttributes: Object.assign({}, el.dataset) as Record<string, string>,
      computedStyles: {
        display: styles.display,
        visibility: styles.visibility,
        position: styles.position,
        borderRadius: styles.borderRadius,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        backgroundImage: styles.backgroundImage,
        objectFit: styles.objectFit,
        overflow: styles.overflow,
        width: styles.width,
        height: styles.height,
        aspectRatio: styles.aspectRatio,
        marginTop: styles.marginTop,
        marginBottom: styles.marginBottom,
        marginLeft: styles.marginLeft,
        marginRight: styles.marginRight,
      },
      rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
      hasChildren: el.childElementCount > 0,
      childCount: el.childElementCount,
      textContent: el.textContent || "",
      naturalWidth: el instanceof HTMLImageElement ? el.naturalWidth : 0,
      naturalHeight: el instanceof HTMLImageElement ? el.naturalHeight : 0,
      src:
        (el as HTMLImageElement).currentSrc ||
        (el as HTMLImageElement).src ||
        (el as HTMLAnchorElement).href ||
        "",
    };

    // Calculate score
    const inferredRole = inferRole(measured, config);
    if (inferredRole === "skip") continue;

    let role: BlueprintNode["role"] = inferredRole;

    // Table & Container Overrides: Persist exact DOM structure wrappers
    if (
      [
        "TABLE",
        "THEAD",
        "TBODY",
        "TFOOT",
        "DIV",
        "FORM",
        "SECTION",
        "ARTICLE",
        "HEADER",
        "FOOTER",
        "MAIN",
        "ASIDE",
        "NAV",
      ].includes(measured.tagName) &&
      measured.hasChildren
    ) {
      role = "container";
    }
    if (measured.tagName === "TR") role = "table-row";
    if (measured.tagName === "TD" || measured.tagName === "TH") role = "table-cell";

    // Layout clipping inside overflow containers
    let width = rect.width;
    let height = rect.height;

    // Clamp to parent bounds if parent has overflow: hidden
    if (parentIndex !== -1) {
      const parent = reads[parentIndex];
      if (parent.styles.overflow === "hidden" ||
        parent.styles.overflowX === "hidden" ||
        parent.styles.overflowY === "hidden"
      ) {
        const topDiff = Math.max(0, parent.rect.top - rect.top);
        const leftDiff = Math.max(0, parent.rect.left - rect.left);
        const rightDiff = Math.max(0, rect.right - parent.rect.right);
        const bottomDiff = Math.max(0, rect.bottom - parent.rect.bottom);

        width = Math.max(0, width - leftDiff - rightDiff);
        height = Math.max(0, height - topDiff - bottomDiff);
      }
    }

    const top = rect.top - rootTop;
    const left = rect.left - rootLeft;

    const node: BlueprintNode = {
      id: `dyn-${nodeCounter++}`,
      role,
      width,
      height,
      top,
      left,
      tagName: measured.tagName,
      borderRadius: styles.borderRadius,
      layout: {},
      children: [],
    };

    // Margin clamping for layout preservation
    const mt = parseFloat(measured.computedStyles.marginTop) || 0;
    const mb = parseFloat(measured.computedStyles.marginBottom) || 0;
    const ml = parseFloat(measured.computedStyles.marginLeft) || 0;
    const mr = parseFloat(measured.computedStyles.marginRight) || 0;

    node.layout.margin = `${Math.max(0, mt)}px ${Math.max(0, mr)}px ${Math.max(0, mb)}px ${Math.max(0, ml)}px`;

    if (role === "text") {
      let lh = parseFloat(styles.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(styles.fontSize) * 1.2;
      const lines = lh > 0 ? Math.max(1, Math.ceil(height / lh)) : 1;
      node.text = {
        lines,
        lineHeight: lh,
        lastLineWidthRatio: lines > 1 ? config.lastLineRatio : 1,
      };
    }

    if (role === "custom" && measured.dataAttributes["skeletonSlot"]) {
      node.slotKey = measured.dataAttributes["skeletonSlot"];
    }

    flatNodes.push({ ...node, parentDepth: depth - 1 });
  }

  // Re-assemble Tree
  const rootNode: BlueprintNode = {
    id: "root",
    role: "container",
    width: rootRect.width,
    height: rootRect.height,
    top: 0,
    left: 0,
    tagName: root.tagName.toUpperCase(),
    borderRadius: "0",
    layout: {},
    children: [],
  };

  const stack: { node: BlueprintNode; depth: number }[] = [{ node: rootNode, depth: -1 }];

  for (let i = 0; i < flatNodes.length; i++) {
    const flat = flatNodes[i];
    const { parentDepth, ...node } = flat;

    while (stack.length > 1 && stack[stack.length - 1].depth >= parentDepth) {
      stack.pop();
    }

    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, depth: parentDepth });
  }

  return {
    version: 1,
    rootWidth: rootRect.width,
    rootHeight: rootRect.height,
    nodes: rootNode.children,
    generatedAt: Date.now(),
    source: "dynamic",
  };
}
