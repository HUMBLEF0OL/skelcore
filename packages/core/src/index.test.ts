import { describe, it, expect } from "vitest";
import { version } from "./index";

describe("core", () => {
  it("has a version", () => {
    expect(version).toBe("0.1.0");
  });
});
