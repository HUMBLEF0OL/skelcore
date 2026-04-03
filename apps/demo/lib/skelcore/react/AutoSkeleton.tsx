"use client";

import React, { useRef, useMemo } from "react";
import {
  DEFAULT_CONFIG,
  type Blueprint,
  type PlaceholderSchema,
  type PlaceholderStrategy,
  type PlaceholderSlots,
  type ElementMatcher,
  type AnimationPreset,
  type SkeletonAnimationDefinition,
  type SkeletonConfig,
} from "../core";
import { useAutoSkeleton } from "./useAutoSkeleton";
import { SkeletonRenderer } from "./SkeletonRenderer";

export interface AutoSkeletonProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  config?: Partial<SkeletonConfig>;
  blueprint?: Blueprint;
  slots?: Record<string, () => React.ReactNode>;
  onMeasured?: (b: Blueprint) => void;
  remeasureOnResize?: boolean;
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  include?: ElementMatcher[];
  exclude?: ElementMatcher[];
  placeholderStrategy?: PlaceholderStrategy;
  placeholderSchema?: PlaceholderSchema;
  placeholderSlots?: PlaceholderSlots<React.ReactNode>;
  animationPreset?: AnimationPreset;
  animationRegistry?: Record<string, SkeletonAnimationDefinition>;
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
  blueprint: externalBlueprint,
  slots,
  onMeasured,
  remeasureOnResize = false,
  overlayClassName,
  overlayStyle: overlayStyleProp,
  placeholderSlots,
}: AutoSkeletonProps) {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...configOverride }), [configOverride]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, containerRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
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

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 10,
    opacity: phase === "exiting" ? 0 : 1,
    transition: `opacity ${config.transitionDuration}ms ease-in`,
    ...overlayStyleProp,
  };

  return (
    <div
      ref={containerRef}
      className="skel-auto-container"
      style={containerStyle}
      aria-busy={loading}
    >
      {/* 1. Content Layer */}
      <div className="skel-content" style={contentStyle} data-loading={loading ? "true" : "false"}>
        {children}
      </div>

      {/* 2. Skeleton Overlay Layer */}
      {showSkeleton && blueprint && (
        <div
          className={`skel-overlay ${overlayClassName || ""}`}
          data-no-skeleton
          style={overlayStyle}
          aria-hidden="true"
        >
          <SkeletonRenderer
            blueprint={blueprint}
            config={config}
            slots={slots || placeholderSlots}
            mode={blueprint.source === "static" ? "flow" : "absolute"}
          />
        </div>
      )}

      {/* 3. Fallback Layer (shown only while measuring) */}
      {phase === "measuring" && !blueprint && fallback && (
        <div className="skel-fallback" data-no-skeleton style={overlayStyle}>
          {fallback}
        </div>
      )}
    </div>
  );
}

export default AutoSkeleton;
