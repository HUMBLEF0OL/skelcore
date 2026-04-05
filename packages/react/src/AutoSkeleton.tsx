"use client";

import React, { useRef, useMemo } from "react";
import {
  DEFAULT_CONFIG,
  type Blueprint,
  type SkeletonConfig,
  type BlueprintManifest,
} from "@ghostframe/core";
import { useAutoSkeleton } from "./useAutoSkeleton";
import { SkeletonRenderer } from "./SkeletonRenderer";
import { useGhostframeContext } from "./GhostframeProvider";
import type { ResolutionEvent, ResolutionPolicy } from "./resolution-types";

export interface AutoSkeletonProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  config?: Partial<SkeletonConfig>;
  blueprint?: Blueprint;
  hydrateBlueprint?: Blueprint;
  blueprintSource?: BlueprintSource;
  onBlueprintInvalidated?: (reason: BlueprintInvalidationReason) => void;
  measurementPolicy?: MeasurementPolicy;
  blueprintCachePolicy?: BlueprintCachePolicy;
  slots?: Record<string, () => React.ReactNode>;
  onMeasured?: (b: Blueprint) => void;
  remeasureOnResize?: boolean;
  skeletonKey?: string;
  policyOverride?: Partial<ResolutionPolicy>;
  onResolution?: (event: ResolutionEvent) => void;
  /** Precomputed manifest for manifest-based resolution */
  manifest?: BlueprintManifest;
}

/**
 * The main AutoSkeleton component.
 * Automatically generates a skeleton based on children structure or provided blueprint.
 */
export function AutoSkeleton({
  loading,
  children,
  fallback,
  config: configOverride,
  blueprint: externalBlueprintProp,
  hydrateBlueprint,
  blueprintSource = "client",
  onBlueprintInvalidated,
  measurementPolicy,
  blueprintCachePolicy,
  slots,
  onMeasured,
  remeasureOnResize = false,
  skeletonKey,
  policyOverride,
  onResolution,
  manifest,
}: AutoSkeletonProps) {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...configOverride }), [configOverride]);

  // Use context as fallback for manifest and policy if not explicitly passed
  const context = useGhostframeContext();
  const effectiveManifest = manifest ?? context?.manifest;
  const effectivePolicy = policyOverride ?? context?.policy;

  const containerRef = useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, containerRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
    skeletonKey,
    policyOverride: effectivePolicy,
    onResolution,
    manifest: effectiveManifest,
  });

  const showSkeleton = loading || phase === "exiting";
  // Keep content visible during measuring so the analyzer can inspect rendered styles.
  const hasOverlayLayer = Boolean(showSkeleton && blueprint);
  const contentVisible = !loading || (phase === "measuring" && !blueprint) || !hasOverlayLayer;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "block", // Ensure we take full width for measurement
    minWidth: "1px",
    minHeight: "1px",
  };

  const contentStyle: React.CSSProperties = {
    visibility: contentVisible ? "visible" : "hidden",
    pointerEvents: contentVisible ? "auto" : "none",
    userSelect: "auto",
  };

  const internalOverlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 10,
    opacity: phase === "exiting" ? 0 : 1,
    transition: `opacity ${config.transitionDuration}ms ease-in`,
  };

  const mergedOverlayStyle: React.CSSProperties = {
    ...internalOverlayStyle,
    ...overlayStyle,
    // Keep overlay semantics safe even when user overrides styling.
    position: "absolute",
    pointerEvents: "none",
  };

  return (
    <div
      ref={containerRef}
      className="skel-auto-container"
      style={containerStyle}
      aria-busy={loading}
      data-skeleton-key={skeletonKey}
    >
      {/* 1. Content Layer */}
      <div className="skel-content" style={contentStyle} data-loading={loading ? "true" : "false"}>
        {children}
      </div>

      {/* 2. Skeleton Overlay Layer */}
      {showSkeleton && blueprint && (
        <div
          className={overlayClassName ? `skel-overlay ${overlayClassName}` : "skel-overlay"}
          data-no-skeleton
          style={mergedOverlayStyle}
          aria-hidden="true"
        >
          <SkeletonRenderer
            blueprint={blueprint}
            config={config}
            slots={resolvedSlots}
            animationPreset={animationPreset}
            animationRegistry={animationRegistry}
            mode={blueprint.source === "static" ? "flow" : "absolute"}
          />
        </div>
      )}

      {/* 3. Fallback Layer (shown only while measuring) */}
      {phase === "measuring" && !blueprint && fallback && (
        <div className="skel-fallback" data-no-skeleton style={internalOverlayStyle}>
          {fallback}
        </div>
      )}
    </div>
  );
}

export default AutoSkeleton;
