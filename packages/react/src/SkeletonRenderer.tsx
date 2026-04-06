"use client";

import React from "react";
import type {
  AnimationPreset,
  Blueprint,
  BlueprintNode,
  SkeletonAnimationDefinition,
  SkeletonConfig,
} from "@ghostframes/core";

type ResolvedAnimation = {
  className: string;
  keyframeName?: string;
  keyframes?: string;
  inlineStyle?: React.CSSProperties;
  durationMs?: number;
};

type AnimationStyleRef = {
  styleElement: HTMLStyleElement;
  refCount: number;
};

const customAnimationStyleRefs = new Map<string, AnimationStyleRef>();

function resolveAnimation(
  preset: AnimationPreset | string | undefined,
  registry: Record<string, SkeletonAnimationDefinition>
): ResolvedAnimation {
  if (!preset || preset === "none") {
    return { className: "" };
  }

  const normalizedPreset = String(preset);
  const custom = registry[normalizedPreset];
  if (custom) {
    const keyframeName = `skel-custom-${normalizedPreset.replace(/[^a-z0-9]+/gi, "").toLowerCase()}`;
    return {
      className: custom.className ?? "",
      keyframeName,
      keyframes: custom.keyframes,
      inlineStyle: {
        ...(custom.inlineStyle ?? {}),
        ...(custom.keyframes && custom.durationMs
          ? {
            animationName: keyframeName,
            animationDuration: `${custom.durationMs}ms`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }
          : {}),
      },
      durationMs: custom.durationMs,
    };
  }

  if (normalizedPreset === "shimmer") {
    return { className: "skel-shimmer" };
  }

  if (normalizedPreset === "pulse") {
    return { className: "skel-pulse" };
  }

  return { className: "" };
}

export interface SkeletonRendererProps {
  blueprint: Blueprint;
  config: SkeletonConfig;
  mode?: "flow" | "absolute";
  slots?: Record<string, () => React.ReactNode>;
  animationPreset?: AnimationPreset | string;
  animationRegistry?: Record<string, SkeletonAnimationDefinition>;
}

/**
 * Pure React component to render a Ghostframes Blueprint.
 * Decoupled from measurement logic; focuses entirely on visual mapping.
 */
export const SkeletonRenderer: React.FC<SkeletonRendererProps> = ({
  blueprint,
  config,
  mode = "absolute",
  slots = {},
  animationPreset,
  animationRegistry,
}) => {
  const requestedPreset = animationPreset ?? config.animation;
  const resolvedAnimation = React.useMemo(
    () => resolveAnimation(requestedPreset, animationRegistry ?? {}),
    [requestedPreset, animationRegistry]
  );

  React.useEffect(() => {
    if (
      !resolvedAnimation.keyframeName ||
      !resolvedAnimation.keyframes ||
      typeof document === "undefined"
    ) {
      return;
    }

    const styleId = `ghostframes-custom-animation-${resolvedAnimation.keyframeName}`;
    const existingRef = customAnimationStyleRefs.get(styleId);
    if (existingRef) {
      existingRef.refCount += 1;
      return () => {
        existingRef.refCount -= 1;
        if (existingRef.refCount <= 0) {
          if (existingRef.styleElement.parentNode) {
            existingRef.styleElement.parentNode.removeChild(existingRef.styleElement);
          }
          customAnimationStyleRefs.delete(styleId);
        }
      };
    }

    const existingStyleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    const styleTag = existingStyleTag ?? document.createElement("style");
    styleTag.id = styleId;
    styleTag.textContent = `@keyframes ${resolvedAnimation.keyframeName} { ${resolvedAnimation.keyframes} }`;
    if (!existingStyleTag) {
      document.head.appendChild(styleTag);
    }

    customAnimationStyleRefs.set(styleId, {
      styleElement: styleTag,
      refCount: 1,
    });

    return () => {
      const currentRef = customAnimationStyleRefs.get(styleId);
      if (!currentRef) {
        return;
      }

      currentRef.refCount -= 1;
      if (currentRef.refCount <= 0) {
        if (currentRef.styleElement.parentNode) {
          currentRef.styleElement.parentNode.removeChild(currentRef.styleElement);
        }
        customAnimationStyleRefs.delete(styleId);
      }
    };
  }, [resolvedAnimation.keyframeName, resolvedAnimation.keyframes]);

  const nodesToRender = React.useMemo(() => {
    if (mode === "flow") return blueprint.nodes;

    const flattened: BlueprintNode[] = [];
    const walk = (items: BlueprintNode[]) => {
      items.forEach((item) => {
        flattened.push(item);
        if (item.children.length > 0) walk(item.children);
      });
    };
    walk(blueprint.nodes);
    return flattened;
  }, [blueprint.nodes, mode]);

  const renderNode = (node: BlueprintNode): React.ReactNode => {
    if (node.role === "skip") return null;

    const isContainer = node.role === "container" || node.isTable || node.isTableRow;
    const isTableCell = node.role === "table-cell" || node.isTableCell;
    const isText = node.role === "text" && node.text;
    const isStaticFlowText = mode === "flow" && blueprint.source === "static" && Boolean(isText);
    const animationClass = resolvedAnimation.className;
    const preserveNodeRadius =
      node.role === "avatar" || (mode === "flow" && blueprint.source === "static");
    const resolvedBorderRadius = preserveNodeRadius
      ? node.borderRadius
      : `${config.borderRadius}px`;

    // Common style attributes
    const commonStyles: React.CSSProperties = {
      borderRadius: resolvedBorderRadius,
      backgroundColor: config.baseColor,
      position: mode === "absolute" ? "absolute" : "relative",
    };

    if (mode === "absolute") {
      commonStyles.top = `${node.top}px`;
      commonStyles.left = `${node.left}px`;
      commonStyles.width = `${node.width}px`;
      commonStyles.height = `${node.height}px`;
    } else if (!isContainer && !isStaticFlowText) {
      commonStyles.width = `${node.width}px`;
      commonStyles.height = `${node.height}px`;
    }

    // 1. Handle Container / Table Roles
    if (isContainer) {
      let Tag: React.ElementType = "div";
      // In absolute mode, table tags can trigger browser table layout quirks.
      // Keep semantic tags for flow mode only.
      if (mode === "flow") {
        if (node.isTable) Tag = "table";
        else if (node.isTableRow) Tag = "tr";
      }

      const filteredLayout = Object.fromEntries(
        Object.entries(node.layout).filter(([key]) => {
          const normalizedKey = key.toLowerCase();
          return !normalizedKey.includes("margin") && !normalizedKey.includes("background");
        })
      );

      return (
        <Tag
          key={node.id}
          className={`skel-container ${node.tagName.toLowerCase()}`}
          style={
            {
              ...commonStyles,
              backgroundColor: "transparent", // Containers are invisible
              ...(mode === "absolute" ? filteredLayout : node.layout),
            } as React.CSSProperties
          }
        >
          {mode === "flow" ? node.children.map(renderNode) : null}
        </Tag>
      );
    }

    // 1.5 Handle Table Cell Role as inset content bars
    if (isTableCell) {
      const widthRatio = node.text?.lastLineWidthRatio ?? config.tableCellDefaultWidthRatio;
      const barHeight = Math.min(
        config.minTextHeight,
        Math.max(config.tableCellBarMinHeight, node.height * config.tableCellBarHeightRatio)
      );
      const cellTag = node.tagName.toLowerCase() === "th" ? "th" : "td";
      const CellTag = mode === "flow" ? cellTag : "div";

      return (
        <CellTag
          key={node.id}
          className="skel-table-cell"
          style={{
            ...commonStyles,
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            paddingInline: `${config.tableCellInsetX}px`,
          }}
        >
          <span
            className={`skel-block ${animationClass} skel-table-cell-bar`}
            style={{
              width: `${Math.round(widthRatio * 100)}%`,
              height: `${barHeight}px`,
              borderRadius: "4px",
              backgroundColor: config.baseColor,
              ...resolvedAnimation.inlineStyle,
            }}
          />
        </CellTag>
      );
    }

    // 2. Handle Text Role (Multi-line bars)
    if (isText && node.text) {
      const { lines, lineHeight, lastLineWidthRatio } = node.text;
      return (
        <div
          key={node.id}
          className="skel-text-group"
          style={{
            ...commonStyles,
            backgroundColor: "transparent",
            ...(isStaticFlowText ? { width: "100%", height: "auto" } : {}),
          }}
        >
          {Array.from({ length: lines }).map((_, i) => (
            <span
              key={`${node.id}-line-${i}`}
              className={`skel-block ${animationClass}`}
              style={{
                display: "block",
                width: i === lines - 1 ? `${lastLineWidthRatio * 100}%` : "100%",
                height: `${config.minTextHeight}px`,
                marginBottom: i < lines - 1 ? `${lineHeight - config.minTextHeight}px` : 0,
                borderRadius: "4px",
                backgroundColor: config.baseColor,
                ...resolvedAnimation.inlineStyle,
              }}
            />
          ))}
        </div>
      );
    }

    // 3. Handle Custom Slots
    if (node.role === "custom" && node.slotKey && slots[node.slotKey]) {
      return (
        <div key={node.id} style={commonStyles}>
          {slots[node.slotKey]()}
        </div>
      );
    }

    // 4. Default: Render as Atomic Block (Image, Button, Icon, etc.)
    return (
      <div
        key={node.id}
        className={`skel-block ${animationClass} skel-role-${node.role}`}
        style={{
          ...commonStyles,
          aspectRatio: node.aspectRatio,
          ...resolvedAnimation.inlineStyle,
        }}
      />
    );
  };

  const rootStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: blueprint.rootHeight > 0 ? `${blueprint.rootHeight}px` : "auto",
  };

  return (
    <div className="skel-renderer-root" style={rootStyle}>
      {nodesToRender.map(renderNode)}
    </div>
  );
};
