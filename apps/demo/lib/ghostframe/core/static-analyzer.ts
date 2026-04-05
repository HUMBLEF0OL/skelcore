import type { Blueprint, BlueprintNode, SkeletonRole } from "./types";

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
    const parsed = parseInt(val, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

// ─── Static Engine ────────────────────────────────────────────────────────────

let nodeCounter = 0;

export function generateStaticBlueprint(rootVNode: VNode): Blueprint {
  nodeCounter = 0;
  const nodes = traverseVNode(rootVNode);

  return {
    version: 1,
    rootWidth: 0, // In static mode, true root metrics are strictly flow-based
    rootHeight: 0,
    nodes,
    generatedAt: Date.now(),
    source: "static",
  };
}

function traverseVNode(vnode: VNode | unknown): BlueprintNode[] {
  if (!isVNode(vnode)) return [];

  const props = (vnode.props as Record<string, unknown>) || {};

  // 1. High-priority exclusions
  if (props["data-no-skeleton"] !== undefined || props["data-skeleton-ignore"] !== undefined) {
    return [];
  }

  // 2. Fragment unrolling
  // React fragments or components might be typed as functions/symbols.
  // We only care about intrinsic HTML elements (typeof type === 'string').
  // For custom components/fragments, we just pass through to their children.
  if (typeof vnode.type !== "string") {
    return parseChildren(props.children);
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

  const children = parseChildren(props.children);

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

  return [node];
}

function parseChildren(children: unknown): BlueprintNode[] {
  if (!children) return [];
  if (Array.isArray(children)) {
    return children.flatMap((c) => traverseVNode(c));
  }
  return traverseVNode(children);
}
