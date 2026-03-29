import React, { useRef, useMemo } from "react";
import { DEFAULT_CONFIG, type Blueprint, type SkeletonConfig } from "@skelcore/core";
import { useAutoSkeleton } from "./useAutoSkeleton.js";
import { SkeletonRenderer } from "./SkeletonRenderer.js";

export interface AutoSkeletonProps {
  loading: boolean;
  children: React.ReactNode;
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
export const AutoSkeleton: React.FC<AutoSkeletonProps> = ({
  loading,
  children,
  config: configOverride,
  blueprint: externalBlueprint,
  slots,
  onMeasured,
  remeasureOnResize = false,
}) => {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...configOverride }), [configOverride]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, containerRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
  });

  const showSkeleton = loading || phase === "exiting";
  const contentVisible = !loading && phase !== "measuring";

  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block", // Shrink wrap children by default
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
    <div ref={containerRef} className="skel-auto-container" style={containerStyle}>
      {/* 1. Content Layer */}
      <div className="skel-content" style={contentStyle}>
        {children}
      </div>

      {/* 2. Skeleton Overlay Layer */}
      {showSkeleton && blueprint && (
        <div className="skel-overlay" style={overlayStyle}>
          <SkeletonRenderer
            blueprint={blueprint}
            config={config}
            slots={slots}
            mode={blueprint.source === "static" ? "flow" : "absolute"}
          />
        </div>
      )}
    </div>
  );
};
