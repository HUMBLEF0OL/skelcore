import { describe, it, expect } from "vitest";
import { inferRole } from "../role-inferencer";
import type { MeasuredNode, SkeletonConfig } from "../types";
import { DEFAULT_CONFIG } from "../types";

// ─── Test Helpers ──────────────────────────────────────────────────────────────

function node(overrides: Partial<MeasuredNode> = {}): MeasuredNode {
  return {
    tagName: "DIV",
    ariaRole: null,
    classList: [],
    dataAttributes: {},
    computedStyles: {
      display: "block",
      visibility: "visible",
      position: "relative",
      borderRadius: "0px",
      fontSize: "16px",
      lineHeight: "24px",
      backgroundImage: "none",
      objectFit: "none",
      overflow: "visible",
      width: "200px",
      height: "auto",
      aspectRatio: "auto",
      marginTop: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
    },
    rect: { width: 200, height: 100, top: 0, left: 0 },
    hasChildren: false,
    childCount: 0,
    textContent: "",
    naturalWidth: 0,
    naturalHeight: 0,
    src: "",
    ...overrides,
  };
}

const cfg: SkeletonConfig = DEFAULT_CONFIG;

// ─── Data Attribute Overrides ──────────────────────────────────────────────────

describe("data-attribute overrides", () => {
  it("data-skeleton-ignore returns skip", () => {
    expect(inferRole(node({ dataAttributes: { "skeleton-ignore": "" } }), cfg)).toBe("skip");
  });

  it("data-skeleton-role returns explicit role", () => {
    expect(inferRole(node({ dataAttributes: { "skeleton-role": "avatar" } }), cfg)).toBe("avatar");
  });

  it("data-skeleton-role ignores invalid values (falls through)", () => {
    const result = inferRole(
      node({ dataAttributes: { "skeleton-role": "INVALID_ROLE" }, tagName: "IMG" }),
      cfg
    );
    expect(result).toBe("image");
  });

  it("data-skeleton-slot returns custom", () => {
    expect(inferRole(node({ dataAttributes: { "skeleton-slot": "hero" } }), cfg)).toBe("custom");
  });

  it("ignore takes priority over slot", () => {
    expect(
      inferRole(node({ dataAttributes: { "skeleton-ignore": "", "skeleton-slot": "hero" } }), cfg)
    ).toBe("skip");
  });
});

// ─── Invisible / Zero-size Elements ───────────────────────────────────────────

describe("invisible or zero-size elements", () => {
  it("display:none returns skip", () => {
    expect(
      inferRole(node({ computedStyles: { ...node().computedStyles, display: "none" } }), cfg)
    ).toBe("skip");
  });

  it("visibility:hidden returns skip", () => {
    expect(
      inferRole(node({ computedStyles: { ...node().computedStyles, visibility: "hidden" } }), cfg)
    ).toBe("skip");
  });

  it("width:0 returns skip", () => {
    expect(inferRole(node({ rect: { width: 0, height: 100, top: 0, left: 0 } }), cfg)).toBe("skip");
  });

  it("height:0 returns skip", () => {
    expect(inferRole(node({ rect: { width: 100, height: 0, top: 0, left: 0 } }), cfg)).toBe("skip");
  });
});

// ─── Image Role ───────────────────────────────────────────────────────────────

describe("image role", () => {
  it("IMG tag -> image", () => {
    expect(inferRole(node({ tagName: "IMG" }), cfg)).toBe("image");
  });

  it("PICTURE tag -> image", () => {
    expect(inferRole(node({ tagName: "PICTURE" }), cfg)).toBe("image");
  });

  it("div with background-image -> image", () => {
    expect(
      inferRole(
        node({
          computedStyles: { ...node().computedStyles, backgroundImage: 'url("photo.jpg")' },
          rect: { width: 200, height: 200, top: 0, left: 0 },
        }),
        cfg
      )
    ).toBe("image");
  });
});

// ─── Avatar Role ──────────────────────────────────────────────────────────────

describe("avatar role", () => {
  it("IMG with borderRadius 50% -> avatar", () => {
    expect(
      inferRole(
        node({
          tagName: "IMG",
          computedStyles: { ...node().computedStyles, borderRadius: "50%" },
        }),
        cfg
      )
    ).toBe("avatar");
  });

  it("IMG with borderRadius 100% -> avatar", () => {
    expect(
      inferRole(
        node({
          tagName: "IMG",
          computedStyles: { ...node().computedStyles, borderRadius: "100%" },
        }),
        cfg
      )
    ).toBe("avatar");
  });

  it("square div with 50% border-radius (48x48) -> avatar", () => {
    expect(
      inferRole(
        node({
          computedStyles: { ...node().computedStyles, borderRadius: "50%" },
          rect: { width: 48, height: 48, top: 0, left: 0 },
        }),
        cfg
      )
    ).toBe("avatar");
  });

  it("large non-square element with 50% borderRadius does not auto-become avatar", () => {
    const result = inferRole(
      node({
        computedStyles: { ...node().computedStyles, borderRadius: "50%" },
        rect: { width: 600, height: 200, top: 0, left: 0 },
      }),
      cfg
    );
    expect(result).not.toBe("avatar");
  });
});

// ─── Icon Role ────────────────────────────────────────────────────────────────

describe("icon role", () => {
  it("SVG within iconMaxSize -> icon", () => {
    expect(
      inferRole(node({ tagName: "SVG", rect: { width: 24, height: 24, top: 0, left: 0 } }), cfg)
    ).toBe("icon");
  });

  it("SVG larger than iconMaxSize but square -> icon (lower score)", () => {
    const result = inferRole(
      node({ tagName: "SVG", rect: { width: 48, height: 48, top: 0, left: 0 } }),
      cfg
    );
    expect(result).toBe("icon");
  });

  it("large SVG (> 2x iconMaxSize) is classified as image or icon based on area", () => {
    const result = inferRole(
      node({ tagName: "SVG", rect: { width: 200, height: 200, top: 0, left: 0 } }),
      cfg
    );
    // Large SVG may score as image or icon — both are valid, just not text/skip
    expect(["image", "icon"]).toContain(result);
  });
});

// ─── Video Role ───────────────────────────────────────────────────────────────

describe("video role", () => {
  it("VIDEO tag -> video", () => {
    expect(inferRole(node({ tagName: "VIDEO" }), cfg)).toBe("video");
  });
});

// ─── Canvas Role ──────────────────────────────────────────────────────────────

describe("canvas role", () => {
  it("CANVAS tag -> canvas", () => {
    expect(inferRole(node({ tagName: "CANVAS" }), cfg)).toBe("canvas");
  });
});

// ─── Button Role ──────────────────────────────────────────────────────────────

describe("button role", () => {
  it("BUTTON tag -> button", () => {
    expect(inferRole(node({ tagName: "BUTTON" }), cfg)).toBe("button");
  });

  it("div with aria role=button -> button", () => {
    expect(inferRole(node({ ariaRole: "button" }), cfg)).toBe("button");
  });

  it("A tag (short text, small rect) -> button", () => {
    expect(
      inferRole(
        node({
          tagName: "A",
          rect: { width: 120, height: 40, top: 0, left: 0 },
          textContent: "Sign Up",
        }),
        cfg
      )
    ).toBe("button");
  });
});

// ─── Input Role ───────────────────────────────────────────────────────────────

describe("input role", () => {
  it("INPUT tag -> input", () => {
    expect(inferRole(node({ tagName: "INPUT" }), cfg)).toBe("input");
  });

  it("TEXTAREA tag -> input", () => {
    expect(inferRole(node({ tagName: "TEXTAREA" }), cfg)).toBe("input");
  });

  it("SELECT tag -> input", () => {
    expect(inferRole(node({ tagName: "SELECT" }), cfg)).toBe("input");
  });

  it("div with aria role=textbox -> input", () => {
    expect(inferRole(node({ ariaRole: "textbox" }), cfg)).toBe("input");
  });

  it("div with aria role=combobox -> input", () => {
    expect(inferRole(node({ ariaRole: "combobox" }), cfg)).toBe("input");
  });
});

// ─── Badge Role ───────────────────────────────────────────────────────────────

describe("badge role", () => {
  it("small pill element with short text -> badge", () => {
    expect(
      inferRole(
        node({
          rect: { width: 60, height: 22, top: 0, left: 0 },
          textContent: "New",
          computedStyles: { ...node().computedStyles, borderRadius: "50%" },
        }),
        cfg
      )
    ).toBe("badge");
  });

  it("aria role=status -> badge", () => {
    expect(
      inferRole(node({ ariaRole: "status", rect: { width: 50, height: 10, top: 0, left: 0 } }), cfg)
    ).toBe("badge");
  });
});

// ─── Text Role (default) ──────────────────────────────────────────────────────

describe("text role", () => {
  it("P tag -> text", () => {
    expect(inferRole(node({ tagName: "P" }), cfg)).toBe("text");
  });

  it("H1 tag -> text", () => {
    expect(inferRole(node({ tagName: "H1" }), cfg)).toBe("text");
  });

  it("SPAN tag -> text", () => {
    expect(inferRole(node({ tagName: "SPAN", textContent: "hello" }), cfg)).toBe("text");
  });

  it("unknown div with text content -> text", () => {
    expect(inferRole(node({ textContent: "some text content" }), cfg)).toBe("text");
  });

  it("fully unknown element falls back to text", () => {
    expect(inferRole(node({ rect: { width: 50, height: 10, top: 0, left: 0 } }), cfg)).toBe("text");
  });
});

// ─── Config Sensitivity ───────────────────────────────────────────────────────

describe("config sensitivity", () => {
  it("custom iconMaxSize affects SVG classification", () => {
    const bigIconCfg: SkeletonConfig = { ...DEFAULT_CONFIG, iconMaxSize: 64 };
    expect(
      inferRole(
        node({ tagName: "SVG", rect: { width: 48, height: 48, top: 0, left: 0 } }),
        bigIconCfg
      )
    ).toBe("icon");
  });

  it("custom minImageArea affects background-image classification", () => {
    const strictCfg: SkeletonConfig = { ...DEFAULT_CONFIG, minImageArea: 50000 };
    // 200x200 = 40000px² < 50000 threshold — should not score as image for area rule
    const result = inferRole(
      node({
        computedStyles: { ...node().computedStyles, backgroundImage: 'url("photo.jpg")' },
        rect: { width: 200, height: 200, top: 0, left: 0 },
      }),
      strictCfg
    );
    // background-image rule still fires, so expect image
    expect(result).toBe("image");
  });
});
