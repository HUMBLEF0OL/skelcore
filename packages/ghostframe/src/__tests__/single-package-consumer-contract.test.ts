import { describe, expect, it } from "vitest";
import * as root from "../index";
import * as runtime from "../runtime";
import * as build from "../build";

describe("single package consumer contract", () => {
  it("exposes react surface at package root", () => {
    expect(typeof root.AutoSkeleton).toBe("function");
  });

  it("exposes runtime APIs via /runtime", () => {
    expect(typeof runtime.generateStaticBlueprint).toBe("function");
  });

  it("exposes build API via /build", () => {
    expect(typeof build.runCli).toBe("function");
  });
});
