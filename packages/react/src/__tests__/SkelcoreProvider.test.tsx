import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkelcoreProvider, useSkelcoreContext } from "../SkelcoreProvider";
import type { BlueprintManifest } from "@skelcore/core";

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
  const context = useSkelcoreContext();
  const hasManifest = context?.manifest ? "true" : "false";
  const policyMode = context?.policy?.mode || "none";
  return (
    <div>
      <span data-testid="has-manifest">{hasManifest}</span>
      <span data-testid="policy-mode">{policyMode}</span>
    </div>
  );
}

describe("SkelcoreProvider", () => {
  it("provides manifest to children", () => {
    render(
      <SkelcoreProvider manifest={mockManifest}>
        <TestComponent />
      </SkelcoreProvider>
    );
    expect(screen.getByTestId("has-manifest")).toHaveTextContent("true");
  });

  it("provides policy to children", () => {
    render(
      <SkelcoreProvider policy={{ mode: "hybrid" }}>
        <TestComponent />
      </SkelcoreProvider>
    );
    expect(screen.getByTestId("policy-mode")).toHaveTextContent("hybrid");
  });

  it("allows consumers to access both manifest and policy", () => {
    render(
      <SkelcoreProvider manifest={mockManifest} policy={{ mode: "precomputed-only" }}>
        <TestComponent />
      </SkelcoreProvider>
    );
    expect(screen.getByTestId("has-manifest")).toHaveTextContent("true");
    expect(screen.getByTestId("policy-mode")).toHaveTextContent("precomputed-only");
  });

  it("returns undefined when not inside provider", () => {
    function ComponentOutsideProvider() {
      const context = useSkelcoreContext();
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
      const context = useSkelcoreContext();
      const version = context?.manifest?.packageVersion || "none";
      return <div data-testid="version">{version}</div>;
    }

    render(
      <SkelcoreProvider manifest={mockManifest}>
        <SkelcoreProvider manifest={innerManifest}>
          <InnerComponent />
        </SkelcoreProvider>
      </SkelcoreProvider>
    );
    expect(screen.getByTestId("version")).toHaveTextContent("0.2.0");
  });
});
