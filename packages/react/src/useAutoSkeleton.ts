"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateDynamicBlueprint,
  blueprintCache,
  animationSystem,
  DEFAULT_CONFIG,
  type Blueprint,
  type SkeletonConfig,
  type BlueprintManifest,
} from "@skelcore/core";
import { resolveBlueprint } from "./resolver";
import type { ResolutionEvent, ResolutionPolicy } from "./resolution-types";

export type SkeletonPhase = "idle" | "measuring" | "showing" | "exiting";

export function useAutoSkeleton(
  loading: boolean,
  contentRef: React.RefObject<HTMLElement | null>,
  config: SkeletonConfig = DEFAULT_CONFIG,
  options: {
    onMeasured?: (b: Blueprint) => void;
    remeasureOnResize?: boolean;
    externalBlueprint?: Blueprint;
    skeletonKey?: string;
    policyOverride?: Partial<ResolutionPolicy>;
    onResolution?: (event: ResolutionEvent) => void;
    manifest?: BlueprintManifest;
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
  const onResolutionRef = useRef(options.onResolution);
  const manifestRef = useRef(options.manifest);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onMeasuredRef.current = options.onMeasured;
  }, [options.onMeasured]);

  useEffect(() => {
    onResolutionRef.current = options.onResolution;
  }, [options.onResolution]);

  useEffect(() => {
    manifestRef.current = options.manifest;
  }, [options.manifest]);

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
      const resolution = resolveBlueprint({
        skeletonKey: options.skeletonKey,
        externalBlueprint: options.externalBlueprint,
        policyOverride: options.policyOverride,
        manifest: options.manifest,
      });

      onResolutionRef.current?.(resolution.event);

      if (resolution.blueprint) {
        setBlueprint(resolution.blueprint);
        setPhase("showing");
      } else {
        measure();
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
  }, [
    loading,
    measure,
    options.externalBlueprint,
    options.policyOverride,
    options.skeletonKey,
    config.transitionDuration,
  ]);

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
