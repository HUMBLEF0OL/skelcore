import { inferRole } from "./role-inferencer.js";
import type {
  Blueprint,
  BlueprintNode,
  ElementMatcher,
  ElementMatcherNodeMeta,
  SkeletonConfig,
  MeasuredNode,
} from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { computeStructuralHash } from "./blueprint-cache.js";

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

function buildMatcherNodeMeta(el: HTMLElement): ElementMatcherNodeMeta {
  return {
    tagName: el.tagName.toUpperCase(),
    ariaRole: el.getAttribute("role"),
    classList: Array.from(el.classList),
    dataAttributes: Object.assign({}, el.dataset) as Record<string, string>,
    textContent: (el.textContent || "").trim(),
    hasChildren: el.childElementCount > 0,
    childCount: el.childElementCount,
  };
}

function matchesMatcher(
  element: HTMLElement,
  nodeMeta: ElementMatcherNodeMeta,
  matcher: ElementMatcher
): boolean {
  if (matcher.selector) {
    try {
      if (!element.matches(matcher.selector)) return false;
    } catch {
      return false;
    }
  }

  if (matcher.role && nodeMeta.role !== matcher.role) return false;

  if (matcher.predicate && !matcher.predicate(nodeMeta)) return false;

  return true;
}

function evaluateIncludeExclude(
  element: HTMLElement,
  nodeMeta: ElementMatcherNodeMeta,
  include: ElementMatcher[],
  exclude: ElementMatcher[]
): boolean {
  const hasIncludeAttr = element.getAttribute("data-skeleton-include") !== null;
  const hasExcludeAttr = element.getAttribute("data-skeleton-exclude") !== null;

  const excludedByMatcher = exclude.some((matcher) => matchesMatcher(element, nodeMeta, matcher));
  if (hasExcludeAttr || excludedByMatcher) return false;

  if (hasIncludeAttr) return true;

  if (include.length === 0) return true;

  return include.some((matcher) => matchesMatcher(element, nodeMeta, matcher));
}

export async function generateDynamicBlueprint(
  root: HTMLElement,
  config: SkeletonConfig = DEFAULT_CONFIG,
  options: {
    include?: ElementMatcher[];
    exclude?: ElementMatcher[];
    budgetMs?: number;
  } = {}
): Promise<Blueprint> {
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const budgetMs =
    typeof options.budgetMs === "number" && options.budgetMs > 0 ? options.budgetMs : undefined;
  const budgetStart =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  const withinBudget = () => {
    if (budgetMs === undefined) return true;
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    return now - budgetStart <= budgetMs;
  };

  // ─── Font Loading ────────────────────────────────────────────────────────────
  // Wait for web fonts to load before measuring text layout
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // ─── PASS 1: COLLECT ─────────────────────────────────────────────────────────
  // No forced layout. We only read the DOM tree structure and attributes.
  const collected: CollectNode[] = [];

  function walk(el: Element, depth: number) {
    if (!withinBudget()) return;
    if (depth > config.maxDepth) return;

    const htmlEl = el as HTMLElement;

    // Fast inline exclusions to skip subtrees entirely
    if (htmlEl.getAttribute("data-skeleton-ignore") !== null) return;
    if (htmlEl.getAttribute("data-no-skeleton") !== null) return;
    if (htmlEl.getAttribute("data-skeleton-exclude") !== null) return;

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
      if (!withinBudget()) return;
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
    if (!withinBudget()) break;
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
  const flatNodes: (BlueprintNode & { parentIndex: number; readIndex: number })[] = [];

  for (let i = 0; i < reads.length; i++) {
    if (!withinBudget()) break;
    const { element: el, rect, styles, parentIndex } = reads[i];

    // Edge-case filtering resolved via CSS
    // Opacity check must handle all falsy variants: "0", "0.0", "0.00", etc.
    const opacityVal = parseFloat(styles.opacity);
    if (
      styles.display === "none" ||
      styles.visibility === "hidden" ||
      (opacityVal >= 0 && opacityVal < 0.01)
    )
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
      textContent: (el.textContent || "").trim(),
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
    const isTableTag = measured.tagName === "TABLE";
    const isTableRowTag = measured.tagName === "TR";
    const isTableCellTag = measured.tagName === "TD" || measured.tagName === "TH";

    if (isTableRowTag) role = "table-row";
    if (isTableCellTag) role = "table-cell";

    const matcherNodeMeta: ElementMatcherNodeMeta = {
      ...buildMatcherNodeMeta(el),
      role,
    };

    if (!evaluateIncludeExclude(el, matcherNodeMeta, include, exclude)) {
      continue;
    }

    // Layout clipping inside overflow containers
    let width = rect.width;
    let height = rect.height;

    // Clamp to parent bounds if parent has overflow: hidden
    if (parentIndex !== -1) {
      const parent = reads[parentIndex];
      if (
        parent.styles.overflow === "hidden" ||
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

    // Transform math mitigation
    let top = rect.top - rootTop;
    let left = rect.left - rootLeft;

    if (styles.transform && styles.transform !== "none") {
      let curr: HTMLElement | null = el;
      top = 0;
      left = 0;
      while (curr && curr !== root) {
        top += curr.offsetTop;
        left += curr.offsetLeft;
        curr = curr.offsetParent as HTMLElement;
      }
    }

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

    // Table cells should render as in-cell bars, not full-cell masks.
    if (role === "table-cell") {
      let lh = parseFloat(styles.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(styles.fontSize) * 1.2;

      node.text = {
        lines: 1,
        lineHeight: lh > 0 ? lh : config.minTextHeight,
        lastLineWidthRatio: measured.tagName === "TH" ? 0.5 : 0.7,
      };
    }

    if (isTableTag) node.isTable = true;
    if (isTableRowTag) node.isTableRow = true;
    if (isTableCellTag) node.isTableCell = true;

    flatNodes.push({ ...node, parentIndex, readIndex: i });
  }

  // Re-assemble Tree using parentIndex for accurate parent-child relationships
  // This correctly handles filtered elements (display:none, too small, etc)

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

  // Track which BlueprintNodes correspond to which reads indices
  // -1 is reserved for root
  const nodeByReadsIndex = new Map<number, BlueprintNode>();
  nodeByReadsIndex.set(-1, rootNode);

  // Now build the hierarchy using flatNodes and their stored parentIndex values
  for (let i = 0; i < flatNodes.length; i++) {
    const flat = flatNodes[i];
    const { parentIndex, readIndex, ...node } = flat;

    // Find nearest surviving ancestor; direct parent may have been filtered out.
    let parentNode = rootNode;
    let currentParentIndex = parentIndex;
    while (currentParentIndex !== -1) {
      if (nodeByReadsIndex.has(currentParentIndex)) {
        parentNode = nodeByReadsIndex.get(currentParentIndex)!;
        break;
      }
      currentParentIndex = reads[currentParentIndex]?.parentIndex ?? -1;
    }

    parentNode.children.push(node);
    nodeByReadsIndex.set(readIndex, node);
  }

  return {
    version: 1,
    rootWidth: rootRect.width,
    rootHeight: rootRect.height,
    nodes: rootNode.children,
    structuralHash: computeStructuralHash(root, config.maxDepth),
    generatedAt: Date.now(),
    source: "dynamic",
  };
}
