"use client";

import React, { useRef, useMemo } from "react";
import { DEFAULT_CONFIG, type Blueprint, type SkeletonConfig } from "../core";
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
}

/**
 * The main AutoSkeleton component.
 * Automatically generates a skeleton based on children structure or provided blueprint.
 */
export default function AutoSkeleton({
  loading,
  children,
  fallback,
  config: configOverride,
  blueprint: externalBlueprint,
  slots,
  onMeasured,
  remeasureOnResize = false,
}: AutoSkeletonProps) {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...configOverride }), [configOverride]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { blueprint, phase, lastDimsRef } = useAutoSkeleton(loading, containerRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
  });

  const showSkeleton = loading || phase === "exiting";
  const contentVisible = !loading && phase !== "measuring";

  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "block", // Ensure we take full width for measurement
    width: "100%",
    minWidth: "1px",
    minHeight: "1px",
  };

  const contentStyle: React.CSSProperties = {
    opacity: contentVisible ? 1 : 0,
    pointerEvents: contentVisible ? "auto" : "none",
    userSelect: contentVisible ? "auto" : "none",
    transition: `opacity ${config.transitionDuration}ms ease-out`,
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
        <div className="skel-overlay" style={overlayStyle} aria-hidden="true">
          <SkeletonRenderer
            blueprint={blueprint}
            config={config}
            slots={slots}
            mode={blueprint.source === "static" ? "flow" : "absolute"}
          />
        </div>
      )}

      {/* 3. Instant placeholder during measuring gap (before blueprint is ready) */}
      {phase === "measuring" && !blueprint && (
        <div
          className="skel-overlay skel-measuring-placeholder"
          style={{
            ...overlayStyle,
            opacity: 1,
            minHeight: lastDimsRef.current?.height
              ? `${lastDimsRef.current.height}px`
              : "60px",
          }}
          aria-hidden="true"
        >
          <div
            className={`skel-block skel-${config.animation}`}
            style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
          />
        </div>
      )}

      {/* 4. User-provided Fallback Layer (only if set, shown while measuring with no prior dims) */}
      {phase === "measuring" && !blueprint && !lastDimsRef.current && fallback && (
        <div className="skel-fallback" style={overlayStyle}>
          {fallback}
        </div>
      )}
    </div>
  );
};
