import type {
  Blueprint,
  BlueprintNode,
  ElementMatcher,
  ElementMatcherNodeMeta,
  SkeletonRole,
} from "./types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const STATIC_DEFAULTS: Record<
  Exclude<SkeletonRole, "skip" | "custom">,
  { width: number; height: number }
> = {
  text: { width: 200, height: 16 },
  image: { width: 300, height: 200 },
  avatar: { width: 40, height: 40 },
  icon: { width: 24, height: 24 },
  button: { width: 120, height: 36 },
  input: { width: 240, height: 40 },
  video: { width: 400, height: 225 },
  canvas: { width: 300, height: 150 },
  badge: { width: 60, height: 22 },
};

const ROLE_BY_TAG: Record<string, SkeletonRole> = {
  img: "image",
  picture: "image",
  svg: "icon",
  button: "button",
  input: "input",
  textarea: "input",
  select: "input",
  video: "video",
  canvas: "canvas",
  p: "text",
  h1: "text",
  h2: "text",
  h3: "text",
  h4: "text",
  h5: "text",
  h6: "text",
  span: "text",
  li: "text",
  td: "text",
  th: "text",
  a: "text",
};

// ─── VDOM Types ───────────────────────────────────────────────────────────────
// Duck-typed minimal React element / generic VNode

export type VNode = {
  type: unknown; // string for HTML tags, function/object for components
  props?: Record<string, unknown>;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function isVNode(child: unknown): child is VNode {
  return typeof child === "object" && child !== null && "type" in child && "props" in child;
}

function parseDimension(val: unknown, fallback: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

// ─── Static Engine ────────────────────────────────────────────────────────────

let nodeCounter = 0;

function hasDataAttribute(nodeMeta: ElementMatcherNodeMeta, attrName: string): boolean {
  const normalized = attrName.startsWith("data-") ? attrName.slice(5) : attrName;
  const camelKey = normalized.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  return nodeMeta.dataAttributes[camelKey] !== undefined;
}

function matchesStaticSelector(selector: string, nodeMeta: ElementMatcherNodeMeta): boolean {
  const token = selector.trim();
  if (!token || /\s|>|\+|~|,/.test(token)) return false;

  if (token.startsWith(".")) {
    const className = token.slice(1);
    return className.length > 0 && nodeMeta.classList.includes(className);
  }

  if (token.startsWith("#")) {
    const id = token.slice(1);
    return id.length > 0 && nodeMeta.dataAttributes["id"] === id;
  }

  if (token.startsWith("[") && token.endsWith("]")) {
    const body = token.slice(1, -1).trim();
    if (!body) return false;

    const [rawAttr, rawValue] = body.split("=");
    const attr = rawAttr.trim();
    if (!attr) return false;

    if (rawValue === undefined) {
      return hasDataAttribute(nodeMeta, attr);
    }

    const expected = rawValue.trim().replace(/^['"]|['"]$/g, "");
    const normalized = attr.startsWith("data-") ? attr.slice(5) : attr;
    const camelKey = normalized.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    return nodeMeta.dataAttributes[camelKey] === expected;
  }

  return nodeMeta.tagName.toLowerCase() === token.toLowerCase();
}

function matchesMatcher(nodeMeta: ElementMatcherNodeMeta, matcher: ElementMatcher): boolean {
  if (matcher.selector && !matchesStaticSelector(matcher.selector, nodeMeta)) return false;
  if (matcher.role && nodeMeta.role !== matcher.role) return false;
  if (matcher.predicate && !matcher.predicate(nodeMeta)) return false;
  return true;
}

function evaluateIncludeExclude(
  nodeMeta: ElementMatcherNodeMeta,
  include: ElementMatcher[],
  exclude: ElementMatcher[]
): boolean {
  const hasIncludeAttr = hasDataAttribute(nodeMeta, "data-skeleton-include");
  const hasExcludeAttr = hasDataAttribute(nodeMeta, "data-skeleton-exclude");

  if (hasExcludeAttr || exclude.some((matcher) => matchesMatcher(nodeMeta, matcher))) {
    return false;
  }

  if (hasIncludeAttr) return true;
  if (include.length === 0) return true;

  return include.some((matcher) => matchesMatcher(nodeMeta, matcher));
}

export function generateStaticBlueprint(
  rootVNode: VNode,
  options: {
    include?: ElementMatcher[];
    exclude?: ElementMatcher[];
  } = {}
): Blueprint {
  nodeCounter = 0;
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const nodes = traverseVNode(rootVNode, include, exclude);

  return {
    version: 1,
    rootWidth: 0, // In static mode, true root metrics are strictly flow-based
    rootHeight: 0,
    nodes,
    generatedAt: Date.now(),
    source: "static",
  };
}

function traverseVNode(
  vnode: VNode | unknown,
  include: ElementMatcher[],
  exclude: ElementMatcher[]
): BlueprintNode[] {
  if (!isVNode(vnode)) return [];

  const props = (vnode.props as Record<string, unknown>) || {};

  // 1. High-priority exclusions
  if (
    props["data-no-skeleton"] !== undefined ||
    props["data-skeleton-ignore"] !== undefined ||
    props["data-skeleton-exclude"] !== undefined
  ) {
    return [];
  }

  // 2. Fragment unrolling
  // React fragments or components might be typed as functions/symbols.
  // We only care about intrinsic HTML elements (typeof type === 'string').
  // For custom components/fragments, we just pass through to their children.
  if (typeof vnode.type !== "string") {
    return parseChildren(props.children, include, exclude);
  }

  const tagName = vnode.type.toLowerCase();

  // 3. Explicit Slot / Role overrides
  let rawRole: SkeletonRole | undefined;
  let slotKey: string | undefined;

  if (typeof props["data-skeleton-slot"] === "string") {
    rawRole = "custom";
    slotKey = props["data-skeleton-slot"];
  } else if (typeof props["data-skeleton-role"] === "string") {
    rawRole = props["data-skeleton-role"] as SkeletonRole;
  }

  // 4. Role inference by tag
  const inferRole = rawRole ?? ROLE_BY_TAG[tagName];
  const knownRole =
    inferRole && inferRole !== "skip" && inferRole !== "custom" ? inferRole : "text";

  const children = parseChildren(props.children, include, exclude);

  // 5. Container vs Leaf
  // If it's a div/section without a specific role but it has recognized children,
  // it should be a structure-preserving 'container'.
  let role: BlueprintNode["role"] = inferRole;

  if (!role && children.length > 0) {
    role = "container";
  } else if (!role) {
    role = "text";
  }

  // Skip explicitly tiny elements or empty non-containers
  if (role === "skip") return [];

  // 6. Layout Extraction for Containers
  const style = (props.style as Record<string, unknown>) || {};
  const layoutProps: Partial<BlueprintNode["layout"]> = {};

  if (role === "container") {
    if (typeof style.display === "string") layoutProps.display = style.display;
    if (typeof style.flexDirection === "string") layoutProps.flexDirection = style.flexDirection;
    if (typeof style.justifyContent === "string") layoutProps.justifyContent = style.justifyContent;
    if (typeof style.alignItems === "string") layoutProps.alignItems = style.alignItems;
    if (typeof style.gap === "string") layoutProps.gap = style.gap;
    if (typeof style.padding === "string") layoutProps.padding = style.padding;
    if (typeof style.gridTemplateColumns === "string")
      layoutProps.gridTemplateColumns = style.gridTemplateColumns;
  }

  // Flex/Grid child properties (always extracted)
  if (typeof style.flex === "string") layoutProps.flex = style.flex;
  if (typeof style.flexGrow === "string") layoutProps.flexGrow = style.flexGrow;
  if (typeof style.gridColumn === "string") layoutProps.gridColumn = style.gridColumn;

  // 7. Dimensions mapping
  const defaults =
    STATIC_DEFAULTS[knownRole as keyof typeof STATIC_DEFAULTS] || STATIC_DEFAULTS.text;

  // Priority: data-skeleton-* > style > props > defaults
  const explicitWidth = (props["data-skeleton-w"] ?? style.width ?? props.width) as unknown;
  const explicitHeight = (props["data-skeleton-h"] ?? style.height ?? props.height) as unknown;

  const width = parseDimension(explicitWidth, defaults.width);
  const height = parseDimension(explicitHeight, defaults.height);

  // 8. Text Meta
  const textMeta =
    role === "text"
      ? {
          lines: 1,
          lineHeight: height,
          lastLineWidthRatio: 0.7,
        }
      : undefined;

  const node: BlueprintNode = {
    id: `static-${nodeCounter++}`,
    role,
    width,
    height,
    top: 0, // Static mode uses flow layout; absolute pos is 0
    left: 0,
    layout: layoutProps,
    borderRadius:
      (typeof style.borderRadius === "string" ? style.borderRadius : null) ||
      (role === "avatar" ? "50%" : "4px"),
    tagName: tagName.toUpperCase(),
    children,
  };

  if (slotKey) node.slotKey = slotKey;
  if (textMeta) node.text = textMeta;
  if (typeof style.aspectRatio === "string") node.aspectRatio = style.aspectRatio;

  const matcherNodeMeta: ElementMatcherNodeMeta = {
    tagName: tagName.toUpperCase(),
    ariaRole: typeof props.role === "string" ? props.role : null,
    classList:
      typeof props.className === "string" ? props.className.split(/\s+/).filter(Boolean) : [],
    dataAttributes: Object.entries(props).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      if (key === "id") {
        acc.id = String(value);
        return acc;
      }
      if (!key.startsWith("data-")) return acc;
      const normalized = key.slice(5).replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      acc[normalized] = String(value);
      return acc;
    }, {}),
    textContent: typeof props.children === "string" ? props.children.trim() : "",
    hasChildren: children.length > 0,
    childCount: children.length,
    role,
  };

  if (!evaluateIncludeExclude(matcherNodeMeta, include, exclude)) {
    return children;
  }

  return [node];
}

function parseChildren(
  children: unknown,
  include: ElementMatcher[],
  exclude: ElementMatcher[]
): BlueprintNode[] {
  if (!children) return [];
  if (Array.isArray(children)) {
    return children.flatMap((c) => traverseVNode(c, include, exclude));
  }
  return traverseVNode(children, include, exclude);
}
