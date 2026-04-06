import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GhostframesProvider, useGhostframesContext } from "../GhostframesProvider";
import type { BlueprintManifest } from "@ghostframes/core";

const mockManifest: BlueprintManifest = {
  manifestVersion: 1,
  packageVersion: "0.1.0",
  build: {
    builtAt: Date.now(),
    appVersion: "1.0.0",
  },
  defaults: { ttlMs: 86400000 },
  entries: {},
};

function TestComponent() {
  const context = useGhostframesContext();
  const hasManifest = context?.manifest ? "true" : "false";
  const policyMode = context?.policy?.mode || "none";
  return (
    <div>
      <span data-testid="has-manifest">{hasManifest}</span>
      <span data-testid="policy-mode">{policyMode}</span>
    </div>
  );
}

describe("GhostframesProvider", () => {
  it("provides manifest to children", () => {
    render(
      <GhostframesProvider manifest={mockManifest}>
        <TestComponent />
      </GhostframesProvider>
    );
    expect(screen.getByTestId("has-manifest")).toHaveTextContent("true");
  });

  it("provides policy to children", () => {
    render(
      <GhostframesProvider policy={{ mode: "hybrid" }}>
        <TestComponent />
      </GhostframesProvider>
    );
    expect(screen.getByTestId("policy-mode")).toHaveTextContent("hybrid");
  });

  it("allows consumers to access both manifest and policy", () => {
    render(
      <GhostframesProvider manifest={mockManifest} policy={{ mode: "precomputed-only" }}>
        <TestComponent />
      </GhostframesProvider>
    );
    expect(screen.getByTestId("has-manifest")).toHaveTextContent("true");
    expect(screen.getByTestId("policy-mode")).toHaveTextContent("precomputed-only");
  });

  it("returns undefined when not inside provider", () => {
    function ComponentOutsideProvider() {
      const context = useGhostframesContext();
      const hasContext = context ? "true" : "false";
      return <div data-testid="has-context">{hasContext}</div>;
    }

    render(<ComponentOutsideProvider />);
    expect(screen.getByTestId("has-context")).toHaveTextContent("false");
  });

  it("handles nested providers with overrides", () => {
    const innerManifest: BlueprintManifest = {
      ...mockManifest,
      packageVersion: "0.2.0",
    };

    function InnerComponent() {
      const context = useGhostframesContext();
      const version = context?.manifest?.packageVersion || "none";
      return <div data-testid="version">{version}</div>;
    }

    render(
      <GhostframesProvider manifest={mockManifest}>
        <GhostframesProvider manifest={innerManifest}>
          <InnerComponent />
        </GhostframesProvider>
      </GhostframesProvider>
    );
    expect(screen.getByTestId("version")).toHaveTextContent("0.2.0");
  });
});
