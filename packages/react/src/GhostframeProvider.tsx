"use client";

import React, { createContext, useContext } from "react";
import type { BlueprintManifest } from "@ghostframe/core";
import type { ResolutionPolicy } from "./resolution-types";

export interface GhostframeContextValue {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
}

export interface GhostframeProviderProps {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
  children: React.ReactNode;
}

const GhostframeContext = createContext<GhostframeContextValue | undefined>(undefined);

/**
 * Provider for app-wide Ghostframe manifest and policy.
 * Allows AutoSkeleton components to opt into manifest-based resolution
 * without manually passing manifest to each component.
 *
 * @example
 * ```tsx
 * <GhostframeProvider manifest={myManifest} policy={{ mode: "hybrid" }}>
 *   <MyApp />
 * </GhostframeProvider>
 * ```
 */
export function GhostframeProvider(props: GhostframeProviderProps): React.ReactElement {
  const { manifest, policy, children } = props;

  const value: GhostframeContextValue = {
    manifest,
    policy,
  };

  return <GhostframeContext.Provider value={value}>{children}</GhostframeContext.Provider>;
}

/**
 * Hook to access Ghostframe context (manifest and policy).
 * Returns undefined if not inside GhostframeProvider.
 *
 * @example
 * ```tsx
 * const context = useGhostframeContext();
 * if (context?.manifest) {
 *   // Use manifest from provider
 * }
 * ```
 */
export function useGhostframeContext(): GhostframeContextValue | undefined {
  return useContext(GhostframeContext);
}
