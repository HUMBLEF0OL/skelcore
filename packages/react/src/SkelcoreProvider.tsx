"use client";

import React, { createContext, useContext } from "react";
import type { BlueprintManifest } from "@skelcore/core";
import type { ResolutionPolicy } from "./resolution-types";

export interface SkelcoreContextValue {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
}

export interface SkelcoreProviderProps {
  manifest?: BlueprintManifest;
  policy?: Partial<ResolutionPolicy>;
  children: React.ReactNode;
}

const SkelcoreContext = createContext<SkelcoreContextValue | undefined>(undefined);

/**
 * Provider for app-wide SkelCore manifest and policy.
 * Allows AutoSkeleton components to opt into manifest-based resolution
 * without manually passing manifest to each component.
 *
 * @example
 * ```tsx
 * <SkelcoreProvider manifest={myManifest} policy={{ mode: "hybrid" }}>
 *   <MyApp />
 * </SkelcoreProvider>
 * ```
 */
export function SkelcoreProvider(props: SkelcoreProviderProps): React.ReactElement {
  const { manifest, policy, children } = props;

  const value: SkelcoreContextValue = {
    manifest,
    policy,
  };

  return (
    <SkelcoreContext.Provider value={value}>
      {children}
    </SkelcoreContext.Provider>
  );
}

/**
 * Hook to access SkelCore context (manifest and policy).
 * Returns undefined if not inside SkelcoreProvider.
 *
 * @example
 * ```tsx
 * const context = useSkelcoreContext();
 * if (context?.manifest) {
 *   // Use manifest from provider
 * }
 * ```
 */
export function useSkelcoreContext(): SkelcoreContextValue | undefined {
  return useContext(SkelcoreContext);
}
