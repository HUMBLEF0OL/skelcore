"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateDynamicBlueprint,
  blueprintCache,
  animationSystem,
  DEFAULT_CONFIG,
  type Blueprint,
  type SkeletonConfig,
} from "../core";

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
  const lastStructuralHashRef = useRef<string | null>(null);
  // Track last known dimensions so we can show an instant placeholder during re-measurement
  const lastDimsRef = useRef<{ width: number; height: number } | null>(null);

  const measure = useCallback(async () => {
    if (!contentRef.current || !loading) return;

    setPhase("measuring");

    try {
      const existingHash = lastStructuralHashRef.current;
      if (existingHash) {
        const cached = blueprintCache.get(contentRef.current, existingHash);
        if (cached) {
          lastDimsRef.current = { width: cached.rootWidth, height: cached.rootHeight };
          setBlueprint(cached);
          setPhase("showing");
          options.onMeasured?.(cached);
          return;
        }
      }

      // Cache miss: measure once, then reuse the returned structural hash.
      const b = await generateDynamicBlueprint(contentRef.current, config);
      const structuralHash = (b as Blueprint & { structuralHash: string }).structuralHash;

      lastStructuralHashRef.current = structuralHash;
      blueprintCache.set(contentRef.current, b, structuralHash);

      lastDimsRef.current = { width: b.rootWidth, height: b.rootHeight };
      setBlueprint(b);
      setPhase("showing");
      options.onMeasured?.(b);
    } catch (err) {
      console.error("[SkelCore] Blueprint measurement failed:", err);
      // Graceful fallback: hide skeleton, show content
      setPhase("idle");
      setBlueprint(null);
    }
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

  return { blueprint, phase, lastDimsRef };
}
