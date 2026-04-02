"use client";

import React, { useState, useEffect } from "react";
import { DEFAULT_CONFIG, AnimationSystem, type Blueprint, type SkeletonConfig, type BlueprintNode } from "../../lib/skelcore/core";

// --- Co-located Library Logic (Hardened Verification) ---

/**
 * Pure React component to render a SkelCore Blueprint.
 */
const SkeletonRenderer: React.FC<{
  blueprint: Blueprint;
  config: SkeletonConfig;
  mode?: "flow" | "absolute";
  slots?: Record<string, () => React.ReactNode>;
}> = ({
  blueprint,
  config,
  mode = "absolute",
  slots = {},
}) => {
  const renderNode = (node: BlueprintNode): React.ReactNode => {
    if (node.role === "skip") return null;
    const isContainer = node.role === "container" || node.isTable || node.isTableRow;
    const isText = node.role === "text" && node.text;
    const animationClass = config.animation === "none" ? "" : `skel-${config.animation}`;
    const commonStyles: React.CSSProperties = {
      borderRadius: node.borderRadius,
      backgroundColor: config.baseColor,
      position: mode === "absolute" ? "absolute" : "relative",
    };
    if (mode === "absolute") {
      commonStyles.top = `${node.top}px`;
      commonStyles.left = `${node.left}px`;
      commonStyles.width = `${node.width}px`;
      commonStyles.height = `${node.height}px`;
    }
    if (isContainer) {
      let Tag: React.ElementType = "div";
      if (node.isTable) Tag = "table";
      else if (node.isTableRow) Tag = "tr";
      else if (node.role === "table-cell") Tag = "td";
      return (
        <Tag key={node.id} className={`skel-container ${node.tagName.toLowerCase()}`} style={{ ...commonStyles, backgroundColor: "transparent", ...(node.layout as React.CSSProperties) }}>
          {node.children.map(renderNode)}
        </Tag>
      );
    }
    if (isText && node.text) {
      const { lines, lineHeight, lastLineWidthRatio } = node.text;
      return (
        <div key={node.id} className="skel-text-group" style={{ ...commonStyles, backgroundColor: "transparent" }}>
          {Array.from({ length: lines }).map((_, i) => (
            <span key={`${node.id}-line-${i}`} className={`skel-block ${animationClass}`} style={{ display: "block", width: i === lines - 1 ? `${lastLineWidthRatio * 100}%` : "100%", height: `${config.minTextHeight}px`, marginBottom: i < lines - 1 ? `${lineHeight - config.minTextHeight}px` : 0, borderRadius: "4px", backgroundColor: config.baseColor }} />
          ))}
        </div>
      );
    }
    if (node.role === "custom" && node.slotKey && slots[node.slotKey]) {
      return (
        <div key={node.id} style={commonStyles}>
          {slots[node.slotKey]()}
        </div>
      );
    }
    return (
      <div key={node.id} className={`skel-block ${animationClass} skel-role-${node.role}`} style={{ ...commonStyles, aspectRatio: node.aspectRatio }} />
    );
  };

  const rootStyle: React.CSSProperties = {
    position: "relative",
    width: blueprint.rootWidth > 0 ? `${blueprint.rootWidth}px` : "100%",
    height: blueprint.rootHeight > 0 ? `${blueprint.rootHeight}px` : "auto",
    overflow: "hidden",
  };

  return (
    <div className="skel-renderer-root" style={rootStyle}>
      {blueprint.nodes.map(renderNode)}
    </div>
  );
};

const animation_system = new AnimationSystem();

function useAutoSkeleton(
  loading: boolean,
  contentRef: React.RefObject<HTMLElement | null>,
  config: SkeletonConfig = DEFAULT_CONFIG,
  options: {
    onMeasured?: (b: Blueprint) => void;
    remeasureOnResize?: boolean;
    externalBlueprint?: Blueprint;
  } = {}
) {
  const [blueprint, setBlueprint] = React.useState<Blueprint | null>(options.externalBlueprint || null);
  const [phase, setPhase] = React.useState<"idle" | "measuring" | "showing" | "exiting">(loading ? "measuring" : "idle");
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  const measure = React.useCallback(async () => {
    const { generateDynamicBlueprint, blueprintCache, computeStructuralHash } = await import("../../lib/skelcore/core");
    if (!contentRef.current || !loading) return;
    setPhase("measuring");
    const hash = computeStructuralHash(contentRef.current);
    const cached = blueprintCache.get(contentRef.current, hash);
    if (cached) {
      setBlueprint(cached);
      setPhase("showing");
      options.onMeasured?.(cached);
      return;
    }
    const b = await generateDynamicBlueprint(contentRef.current, config);
    blueprintCache.set(contentRef.current, b, hash);
    setBlueprint(b);
    setPhase("showing");
    options.onMeasured?.(b);
  }, [loading, contentRef, config, options.onMeasured]);

  React.useEffect(() => {
    if (loading) {
      if (options.externalBlueprint) {
        setBlueprint(options.externalBlueprint);
        setPhase("showing");
      } else {
        measure();
      }
    } else {
      if (phase === "showing") {
        setPhase("exiting");
        const timer = setTimeout(() => {
          setPhase("idle");
          setBlueprint(null);
        }, config.transitionDuration);
        return () => clearTimeout(timer);
      } else {
        setPhase("idle");
        setBlueprint(null);
      }
    }
  }, [loading, measure, options.externalBlueprint, config.transitionDuration]);

  React.useEffect(() => {
    if (options.remeasureOnResize && loading && contentRef.current && phase === "showing") {
      resizeObserverRef.current = new ResizeObserver(() => {
        measure();
      });
      resizeObserverRef.current.observe(contentRef.current);
      return () => resizeObserverRef.current?.disconnect();
    }
  }, [options.remeasureOnResize, loading, contentRef, phase, measure]);

  React.useEffect(() => {
    animation_system.injectStyles(config);
  }, [config]);

  return { blueprint, phase };
}

const AutoSkeleton = ({
  loading,
  children,
  fallback,
  config: configOverride,
  blueprint: externalBlueprint,
  slots,
  onMeasured,
  remeasureOnResize = false,
}: {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  config?: Partial<SkeletonConfig>;
  blueprint?: Blueprint;
  slots?: Record<string, () => React.ReactNode>;
  onMeasured?: (b: Blueprint) => void;
  remeasureOnResize?: boolean;
}) => {
  const config = React.useMemo(() => ({ ...DEFAULT_CONFIG, ...configOverride }), [configOverride]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { blueprint, phase } = useAutoSkeleton(loading, containerRef, config, {
    onMeasured,
    remeasureOnResize,
    externalBlueprint,
  });

  const showSkeleton = loading || phase === "exiting";
  const contentVisible = !loading && phase !== "measuring";

  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
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
    <div ref={containerRef} className="skel-auto-container" style={containerStyle} aria-busy={loading}>
      <div className="skel-content" style={contentStyle} data-loading={loading ? "true" : "false"}>
        {children}
      </div>
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
      {phase === "measuring" && !blueprint && fallback && (
        <div className="skel-fallback" style={overlayStyle}>
          {fallback}
        </div>
      )}
    </div>
  );
};

export default function TestPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">SkelCore E2E Test Bench</h1>
      
      <button 
        id="toggle-loading"
        onClick={() => setLoading(!loading)}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Toggle Loading: {loading ? "ON" : "OFF"}
      </button>

      <div className="grid grid-cols-2 gap-10">
        <section>
          <h2 className="text-lg font-semibold mb-2">Standard Component</h2>
          <AutoSkeleton loading={loading} remeasureOnResize>
            <div id="test-card" className="p-4 border rounded shadow-sm bg-white">
              <div className="flex items-center gap-4 mb-4">
                <div data-skeleton-role="avatar" className="w-12 h-12 rounded-full bg-zinc-200" />
                <div>
                  <h3 className="text-lg font-medium">SkelCore Library</h3>
                  <p className="text-sm text-zinc-500">Sub-millisecond skeletons</p>
                </div>
              </div>
              <p className="text-zinc-700 leading-relaxed mb-4">
                This is a multi-line paragraph that should be accurately mirrored by the 
                SkelCore animation engine. It should detect the line height and the 
                number of lines correctly.
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-zinc-100 rounded text-xs">Tag A</button>
                <button className="px-3 py-1 bg-zinc-100 rounded text-xs">Tag B</button>
                <button 
                  data-skeleton-ignore 
                  id="cancel-btn"
                  className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs"
                >
                  Cancel (Always Visible)
                </button>
              </div>
            </div>
          </AutoSkeleton>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Table Component</h2>
          <AutoSkeleton loading={loading}>
            <table id="test-table" className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Item</th>
                  <th className="text-right p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Premium Plan</td>
                  <td className="p-2 text-right">$49.00</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Basic Plan</td>
                  <td className="p-2 text-right">$19.00</td>
                </tr>
              </tbody>
            </table>
          </AutoSkeleton>
        </section>
      </div>

      <div className="mt-10" dir="rtl">
        <h2 className="text-lg font-semibold mb-2">RTL Test</h2>
        <AutoSkeleton loading={loading}>
          <div id="test-rtl" className="p-4 bg-zinc-50 border rounded text-right">
            <h3 className="text-xl">مرحبا بالعالم</h3>
            <p>هذا النص باللغة العربية لاختبار اتجاه اليمين إلى اليسار.</p>
          </div>
        </AutoSkeleton>
      </div>
    </div>
  );
}
