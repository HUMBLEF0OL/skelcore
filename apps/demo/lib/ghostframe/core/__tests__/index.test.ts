import { describe, it, expect } from "vitest";
import * as core from "../index";

describe("core index exports", () => {
  it("exports DEFAULT_CONFIG", () => {
    expect(core.DEFAULT_CONFIG).toBeDefined();
    expect(core.DEFAULT_CONFIG.animation).toBe("shimmer");
  });
});
