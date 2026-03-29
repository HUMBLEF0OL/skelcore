import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateDynamicBlueprint,
  blueprintCache,
  computeStructuralHash,
  animationSystem,
  DEFAULT_CONFIG,
  type Blueprint,
  type SkeletonConfig,
} from "@skelcore/core";

export type SkeletonPhase = "idle" | "measuring" | "showing" | "exiting";

export function useAutoSkeleton(
  loading: boolean,
  contentRef: React.RefObject<HTMLElement | null>,
  config: SkeletonConfig = DEFAULT_CONFIG,
  options: {
    onMeasured?: (b: Blueprint) => void;
    remeasureOnResize?: boolean;
    externalBlueprint?: Blueprint;
  } = {}
) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(options.externalBlueprint || null);
  const [phase, setPhase] = useState<SkeletonPhase>(loading ? "measuring" : "idle");
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(async () => {
    if (!contentRef.current || !loading) return;

    setPhase("measuring");

    // 1. Check Cache
    const hash = computeStructuralHash(contentRef.current);
    const cached = blueprintCache.get(contentRef.current, hash);
    if (cached) {
      setBlueprint(cached);
      setPhase("showing");
      options.onMeasured?.(cached);
      return;
    }

    // 2. Perform Dynamic Scann (await internal rAF/Font settling)
    const b = await generateDynamicBlueprint(contentRef.current, config);
    blueprintCache.set(contentRef.current, b, hash);

    setBlueprint(b);
    setPhase("showing");
    options.onMeasured?.(b);
  }, [loading, contentRef, config, options.onMeasured]);

  // Initial Measurement and Loading Toggle
  useEffect(() => {
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

  // Handle Resize
  useEffect(() => {
    if (options.remeasureOnResize && loading && contentRef.current && phase === "showing") {
      resizeObserverRef.current = new ResizeObserver(() => {
        measure();
      });
      resizeObserverRef.current.observe(contentRef.current);
      return () => resizeObserverRef.current?.disconnect();
    }
  }, [options.remeasureOnResize, loading, contentRef, phase, measure]);

  // Inject Styles (idempotent)
  useEffect(() => {
    animationSystem.injectStyles(config);
  }, [config]);

  return { blueprint, phase };
}
