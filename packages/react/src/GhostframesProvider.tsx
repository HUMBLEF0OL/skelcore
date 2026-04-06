"use client";

import React, { createContext, useContext } from "react";
import type { BlueprintManifest } from "@ghostframes/core";
import type { ResolutionPolicy } from "./resolution-types";

export interface GhostframesContextValue {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
}

export interface GhostframesProviderProps {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
  children: React.ReactNode;
}

const GhostframesContext = createContext<GhostframesContextValue | undefined>(undefined);

/**
 * Provider for app-wide Ghostframes manifest and policy.
 * Allows AutoSkeleton components to opt into manifest-based resolution
 * without manually passing manifest to each component.
 *
 * @example
 * ```tsx
 * <GhostframesProvider manifest={myManifest} policy={{ mode: "hybrid" }}>
 *   <MyApp />
 * </GhostframesProvider>
 * ```
 */
export function GhostframesProvider(props: GhostframesProviderProps): React.ReactElement {
  const { manifest, policy, children } = props;

  const value: GhostframesContextValue = {
    manifest,
    policy,
  };

  return <GhostframesContext.Provider value={value}>{children}</GhostframesContext.Provider>;
}

/**
 * Hook to access Ghostframes context (manifest and policy).
 * Returns undefined if not inside GhostframesProvider.
 *
 * @example
 * ```tsx
 * const context = useGhostframesContext();
 * if (context?.manifest) {
 *   // Use manifest from provider
 * }
 * ```
 */
export function useGhostframesContext(): GhostframesContextValue | undefined {
  return useContext(GhostframesContext);
}
