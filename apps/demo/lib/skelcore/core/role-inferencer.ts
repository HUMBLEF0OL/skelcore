import type { MeasuredNode, SkeletonConfig, SkeletonRole } from "./types";

// ─── Internal Scoring Types ────────────────────────────────────────────────────

type ScoringRole = Exclude<SkeletonRole, "skip" | "custom">;

type ScoringRule = {
  role: ScoringRole;
  points: number;
  condition: (node: MeasuredNode, config: SkeletonConfig) => boolean;
};

// ─── Helper Utilities ──────────────────────────────────────────────────────────

function parseBorderRadius(value: string): number {
  if (value.endsWith("%")) return parseFloat(value);
  // Tailwind `rounded-full` computes to 9999px — treat large px values as circular
  const px = parseFloat(value);
  if (!isNaN(px) && px >= 40) return 50;
  return 0;
}

function isCircular(styles: MeasuredNode["computedStyles"]): boolean {
  const r = parseBorderRadius(styles.borderRadius);
  return r >= 50;
}

function area(node: MeasuredNode): number {
  return node.rect.width * node.rect.height;
}

function isApproximatelySquare(node: MeasuredNode, tolerance = 0.2): boolean {
  const { width, height } = node.rect;
  if (width === 0 || height === 0) return false;
  return Math.abs(width - height) / Math.max(width, height) <= tolerance;
}

const TAGS = {
  img: new Set(["IMG", "PICTURE"]),
  svg: new Set(["SVG"]),
  video: new Set(["VIDEO"]),
  canvas: new Set(["CANVAS"]),
  button: new Set(["BUTTON", "A"]),
  input: new Set(["INPUT", "TEXTAREA", "SELECT"]),
  text: new Set(["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LABEL", "LI", "TD", "TH"]),
} as const;

// ─── Scoring Rules Table ───────────────────────────────────────────────────────
// Rules are processed in order; scores accumulate per role.
// The role with the highest score >= THRESHOLD wins.

const THRESHOLD = 30;

const SCORING_RULES: ScoringRule[] = [
  // ── IMAGE ───────────────────────────────────────────────────────────────────
  { role: "image", points: 100, condition: (n) => TAGS.img.has(n.tagName) },
  {
    role: "image",
    points: 40,
    condition: (n) =>
      n.computedStyles.backgroundImage !== "none" && n.computedStyles.backgroundImage !== "",
  },
  {
    role: "image",
    points: 40,
    condition: (n, cfg) =>
      area(n) >= cfg.minImageArea && !n.hasChildren && n.textContent.trim().length === 0,
  },

  // ── AVATAR ──────────────────────────────────────────────────────────────────
  {
    role: "avatar",
    points: 150, // beats image (100) when IMG + circular
    condition: (n) => TAGS.img.has(n.tagName) && isCircular(n.computedStyles),
  },
  {
    role: "avatar",
    points: 100, // beats text (80) for square circular element in avatar size range
    condition: (n) =>
      isCircular(n.computedStyles) &&
      isApproximatelySquare(n) &&
      n.rect.width >= 24 &&
      n.rect.width <= 128,
  },

  // ── ICON ────────────────────────────────────────────────────────────────────
  {
    role: "icon",
    points: 100,
    condition: (n, cfg) => TAGS.svg.has(n.tagName) && n.rect.width <= cfg.iconMaxSize,
  },
  {
    role: "icon",
    points: 60,
    condition: (n, cfg) =>
      TAGS.svg.has(n.tagName) && n.rect.width <= cfg.iconMaxSize * 2 && isApproximatelySquare(n),
  },
  {
    role: "icon",
    points: 40,
    condition: (n, cfg) =>
      !TAGS.svg.has(n.tagName) &&
      isApproximatelySquare(n) &&
      n.rect.width <= cfg.iconMaxSize &&
      n.rect.width >= 8,
  },

  // ── VIDEO ───────────────────────────────────────────────────────────────────
  { role: "video", points: 100, condition: (n) => TAGS.video.has(n.tagName) },

  // ── CANVAS ──────────────────────────────────────────────────────────────────
  { role: "canvas", points: 100, condition: (n) => TAGS.canvas.has(n.tagName) },

  // ── BUTTON ──────────────────────────────────────────────────────────────────
  { role: "button", points: 100, condition: (n) => n.tagName === "BUTTON" },
  {
    role: "button",
    points: 80,
    condition: (n) => n.ariaRole === "button",
  },
  {
    role: "button",
    points: 60,
    condition: (n) =>
      n.tagName === "A" && n.rect.width < 300 && n.rect.height < 80 && n.textContent.length < 40,
  },

  // ── INPUT ───────────────────────────────────────────────────────────────────
  { role: "input", points: 100, condition: (n) => TAGS.input.has(n.tagName) },
  {
    role: "input",
    points: 80,
    condition: (n) => n.ariaRole === "textbox" || n.ariaRole === "combobox",
  },

  // ── BADGE ───────────────────────────────────────────────────────────────────
  {
    role: "badge",
    points: 80,
    condition: (n) =>
      n.rect.height <= 28 &&
      n.rect.width <= 120 &&
      n.textContent.length > 0 &&
      n.textContent.length <= 20 &&
      parseBorderRadius(n.computedStyles.borderRadius) >= 20,
  },
  {
    role: "badge",
    points: 40,
    condition: (n) => n.ariaRole === "status" || n.ariaRole === "note",
  },

  // ── TEXT ────────────────────────────────────────────────────────────────────
  {
    role: "text",
    points: 80,
    condition: (n) => TAGS.text.has(n.tagName),
  },
  {
    role: "text",
    points: 40,
    condition: (n) => n.textContent.length > 0 && !n.hasChildren,
  },
];

// ─── Public API ────────────────────────────────────────────────────────────────

export function inferRole(node: MeasuredNode, config: SkeletonConfig): SkeletonRole {
  // ── Step 1: High-priority attribute overrides (exempt from scoring) ──────────
  if (node.dataAttributes["skeleton-ignore"] !== undefined) return "skip";

  if (node.dataAttributes["skeleton-role"] !== undefined) {
    const explicit = node.dataAttributes["skeleton-role"] as SkeletonRole;
    // Validate against known roles; fall through if invalid
    const valid: SkeletonRole[] = [
      "text",
      "image",
      "avatar",
      "icon",
      "button",
      "input",
      "video",
      "canvas",
      "badge",
      "custom",
      "skip",
    ];
    if (valid.includes(explicit)) return explicit;
  }

  if (node.dataAttributes["skeleton-slot"] !== undefined) return "custom";

  // ── Step 2: Invisible / zero-size elements ───────────────────────────────────
  if (
    node.computedStyles.display === "none" ||
    node.computedStyles.visibility === "hidden" ||
    node.rect.width === 0 ||
    node.rect.height === 0
  ) {
    return "skip";
  }

  // ── Step 3: Accumulate scores ────────────────────────────────────────────────
  const scores = new Map<ScoringRole, number>();

  for (const rule of SCORING_RULES) {
    if (rule.condition(node, config)) {
      scores.set(rule.role, (scores.get(rule.role) ?? 0) + rule.points);
    }
  }

  // ── Step 4: Find winner above threshold ──────────────────────────────────────
  let bestRole: ScoringRole | null = null;
  let bestScore = THRESHOLD - 1; // exclusive min

  for (const [role, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }

  return bestRole ?? "text";
}
