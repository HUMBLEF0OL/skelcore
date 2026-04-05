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
  const loadingRef = useRef(loading);
  const measureRunIdRef = useRef(0);
  const blueprintRef = useRef<Blueprint | null>(options.externalBlueprint || null);
  const onMeasuredRef = useRef(options.onMeasured);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onMeasuredRef.current = options.onMeasured;
  }, [options.onMeasured]);

  useEffect(() => {
    blueprintRef.current = blueprint;
  }, [blueprint]);

  const measure = useCallback(async () => {
    if (!contentRef.current || !loading) return;

    const runId = ++measureRunIdRef.current;

    setPhase("measuring");

    const existingHash = lastStructuralHashRef.current;
    if (existingHash) {
      const cached = blueprintCache.get(contentRef.current, existingHash);
      if (cached) {
        setBlueprint(cached);
        setPhase("showing");
        onMeasuredRef.current?.(cached);
        return;
      }
    }

    // Cache miss: measure once, then reuse the returned structural hash.
    const b = await generateDynamicBlueprint(contentRef.current, config);
    if (runId !== measureRunIdRef.current || !loadingRef.current) {
      return;
    }

    // Keep the currently rendered skeleton if a re-measure temporarily yields no nodes.
    if (b.nodes.length === 0 && blueprintRef.current) {
      setPhase("showing");
      return;
    }

    const structuralHash = b.structuralHash;

    if (structuralHash) {
      lastStructuralHashRef.current = structuralHash;
      blueprintCache.set(contentRef.current, b, structuralHash);
    }

    setBlueprint(b);
    setPhase("showing");
    onMeasuredRef.current?.(b);
  }, [loading, contentRef, config]);

  // Initial Measurement and Loading Toggle
  useEffect(() => {
    if (loading) {
      const externalBlueprint = options.externalBlueprint;
      if (externalBlueprint) {
        // Use queueMicrotask to defer state updates to avoid direct setState in effect
        queueMicrotask(() => {
          setBlueprint(externalBlueprint);
          setPhase("showing");
        });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void measure();
      }
    } else {
      measureRunIdRef.current += 1;
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
  }, [loading, measure, options.externalBlueprint, config.transitionDuration, phase]);

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
