import * as root from "../index";
import * as react from "../react";
import * as runtime from "../runtime";
import * as build from "../build";

describe("@ghostframe/ghostframe export contract", () => {
  test("root exports React facade symbols", () => {
    expect(typeof root.AutoSkeleton).toBe("function");
    expect(typeof root.useAutoSkeleton).toBe("function");
    expect(typeof root.GhostframeProvider).toBe("function");
  });

  test("react subpath exports expected symbols", () => {
    expect(typeof react.AutoSkeleton).toBe("function");
    expect(typeof react.resolveBlueprint).toBe("function");
  });

  test("runtime subpath exports expected symbols", () => {
    expect(typeof runtime.inferRole).toBe("function");
    expect(typeof runtime.generateDynamicBlueprint).toBe("function");
    expect(typeof runtime.generateStaticBlueprint).toBe("function");
    expect(typeof runtime.blueprintCache).toBe("object");
  });

  test("build subpath exports expected symbols", () => {
    expect(typeof build.runCli).toBe("function");
  });
});
