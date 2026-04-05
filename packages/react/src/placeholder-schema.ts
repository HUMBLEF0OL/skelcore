import type {
  Blueprint,
  BlueprintNode,
  PlaceholderSchema,
  PlaceholderSchemaBlock,
} from "@ghostframe/core";

const MAX_SCHEMA_REPEAT = 50;
const DEFAULT_TEXT_LINE_HEIGHT = 16;

function normalizeBorderRadius(value: PlaceholderSchemaBlock["borderRadius"]): string {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return "4px";
}

function createNodeFromBlock(block: PlaceholderSchemaBlock, id: string): BlueprintNode {
  const normalizedRole = block.role ?? "text";
  const node: BlueprintNode = {
    id,
    role: normalizedRole,
    width: block.width,
    height: block.height,
    top: 0,
    left: 0,
    layout: {},
    borderRadius: normalizeBorderRadius(block.borderRadius),
    tagName: normalizedRole === "table-cell" ? "TD" : "DIV",
    children: [],
  };

  if (normalizedRole === "text" || normalizedRole === "table-cell") {
    node.text = {
      lines: Math.max(1, Math.round(block.height / DEFAULT_TEXT_LINE_HEIGHT)),
      lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
      lastLineWidthRatio: 0.7,
    };
  }

  if (block.slotKey) {
    node.slotKey = block.slotKey;
  }

  return node;
}

export function isValidPlaceholderSchema(input: unknown): input is PlaceholderSchema {
  if (!input || typeof input !== "object") return false;
  const maybeSchema = input as Partial<PlaceholderSchema>;

  if (!Array.isArray(maybeSchema.blocks) || maybeSchema.blocks.length === 0) {
    return false;
  }

  return maybeSchema.blocks.every((block) => {
    if (!block || typeof block !== "object") return false;

    const width = (block as Partial<PlaceholderSchemaBlock>).width;
    const height = (block as Partial<PlaceholderSchemaBlock>).height;
    const repeat = (block as Partial<PlaceholderSchemaBlock>).repeat;

    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) return false;
    if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) return false;
    if (repeat == null) return true;

    return Number.isInteger(repeat) && repeat > 0;
  });
}

export function buildSchemaPlaceholderBlueprint(schema: PlaceholderSchema): Blueprint {
  const nodes: BlueprintNode[] = [];
  let rootHeight = 0;

  schema.blocks.forEach((block, blockIndex) => {
    const repeat = Math.min(block.repeat ?? 1, MAX_SCHEMA_REPEAT);
    for (let repetitionIndex = 0; repetitionIndex < repeat; repetitionIndex += 1) {
      nodes.push(createNodeFromBlock(block, `schema-${blockIndex}-${repetitionIndex}`));
      rootHeight += block.height;
    }
  });

  return {
    version: 1,
    rootWidth: 0,
    rootHeight,
    nodes,
    generatedAt: Date.now(),
    source: "static",
  };
}

export function buildSlotsPlaceholderBlueprint(slotKeys: string[]): Blueprint | null {
  if (slotKeys.length === 0) return null;

  const blocks: PlaceholderSchemaBlock[] = slotKeys.map((slotKey) => ({
    role: "custom",
    width: 240,
    height: 16,
    slotKey,
  }));

  return buildSchemaPlaceholderBlueprint({ blocks });
}
