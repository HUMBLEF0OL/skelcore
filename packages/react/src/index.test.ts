import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@ghostframe/core";

describe("react index exports", () => {
  it("can import DEFAULT_CONFIG from core via react package", () => {
    expect(DEFAULT_CONFIG).toBeDefined();
  });
});
