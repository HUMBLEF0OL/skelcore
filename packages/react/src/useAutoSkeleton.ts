"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateDynamicBlueprint,
  blueprintCache,
  computeStructuralHash,
  animationSystem,
  DEFAULT_CONFIG,
  type Blueprint,
  type ElementMatcher,
  type SkeletonConfig,
  type BlueprintManifest,
  type BlueprintSource,
  type BlueprintInvalidationReason,
  type MeasurementPolicy,
  type BlueprintCachePolicy,
} from "@ghostframes/core";
import { recordRuntimeBlueprint, resolveBlueprint } from "./resolver";
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
    hydrateBlueprint?: Blueprint;
    blueprintSource?: BlueprintSource;
    onBlueprintInvalidated?: (reason: BlueprintInvalidationReason) => void;
    measurementPolicy?: MeasurementPolicy;
    blueprintCachePolicy?: BlueprintCachePolicy;
    include?: ElementMatcher[];
    exclude?: ElementMatcher[];
    skeletonKey?: string;
    policyOverride?: Partial<ResolutionPolicy>;
    onResolution?: (event: ResolutionEvent) => void;
    manifest?: BlueprintManifest;
  } = {}
) {
  const measurementPolicy = options.measurementPolicy ?? { mode: "eager" as const };
  const cachePolicy = options.blueprintCachePolicy;

  const [blueprint, setBlueprint] = useState<Blueprint | null>(() => {
    if (options.externalBlueprint) return options.externalBlueprint;

    return null;
  });
  const [phase, setPhase] = useState<SkeletonPhase>(loading ? "measuring" : "idle");
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastStructuralHashRef = useRef<string | null>(null);
  const loadingRef = useRef(loading);
  const measureRunIdRef = useRef(0);
  const blueprintRef = useRef<Blueprint | null>(blueprint);
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

  const clearScheduledMeasurement = useCallback(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
      intersectionObserverRef.current = null;
    }

    if (
      idleCallbackRef.current !== null &&
      typeof window !== "undefined" &&
      "cancelIdleCallback" in window
    ) {
      (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
        idleCallbackRef.current
      );
      idleCallbackRef.current = null;
    }

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const isBlueprintValidForCachePolicy = useCallback(
    (candidate: Blueprint) => {
      if (!cachePolicy) return true;

      if (cachePolicy.version !== undefined && candidate.version !== cachePolicy.version) {
        return false;
      }

      if (cachePolicy.ttlMs !== undefined && cachePolicy.ttlMs > 0) {
        if (Date.now() - candidate.generatedAt > cachePolicy.ttlMs) {
          return false;
        }
      }

      return true;
    },
    [cachePolicy]
  );

  const validateHydratedBlueprint = useCallback(
    (candidate: Blueprint): BlueprintInvalidationReason | null => {
      if (!isBlueprintValidForCachePolicy(candidate)) {
        return "version-mismatch";
      }

      const source = options.blueprintSource ?? "client";
      if (source === "client") {
        return null;
      }

      if (!contentRef.current) {
        return "missing-root";
      }

      if (!candidate.structuralHash) {
        return "missing-structural-hash";
      }

      const currentStructuralHash = computeStructuralHash(contentRef.current, config.maxDepth);
      if (currentStructuralHash !== candidate.structuralHash) {
        return "structural-hash-mismatch";
      }

      return null;
    },
    [config.maxDepth, contentRef, isBlueprintValidForCachePolicy, options.blueprintSource]
  );

  const measure = useCallback(
    async (baseEvent?: ResolutionEvent) => {
      if (!contentRef.current || !loading) return;

      const runId = ++measureRunIdRef.current;
      const measurementStartMs = Date.now();
      setPhase("measuring");

      const existingHash = lastStructuralHashRef.current;
      if (existingHash) {
        const cached = blueprintCache.get(contentRef.current, existingHash);
        if (cached && isBlueprintValidForCachePolicy(cached)) {
          setBlueprint(cached);
          setPhase("showing");
          onMeasuredRef.current?.(cached);
          if (baseEvent?.source === "dynamic") {
            onResolutionRef.current?.({
              ...baseEvent,
              reason: "dynamic-measured",
              measurementDurationMs: Math.max(Date.now() - measurementStartMs, 0),
            });
          }
          return;
        }

        if (cached) {
          blueprintCache.invalidate(contentRef.current);
        }
      }

      // Cache miss: measure once, then reuse the returned structural hash.
      const b = await generateDynamicBlueprint(contentRef.current, config, {
        include: options.include,
        exclude: options.exclude,
        budgetMs: measurementPolicy.budgetMs,
      });
      if (runId !== measureRunIdRef.current || !loadingRef.current) {
        return;
      }

      // Keep the currently rendered skeleton if a re-measure temporarily yields no nodes.
      if (b.nodes.length === 0 && blueprintRef.current) {
        setPhase("showing");
        if (baseEvent?.source === "dynamic") {
          onResolutionRef.current?.({
            ...baseEvent,
            reason: "dynamic-measured-empty",
            measurementDurationMs: Math.max(Date.now() - measurementStartMs, 0),
          });
        }
        return;
      }

      const structuralHash = b.structuralHash;

      if (structuralHash) {
        lastStructuralHashRef.current = structuralHash;
        blueprintCache.set(contentRef.current, b, structuralHash);
      }

      setBlueprint(b);
      setPhase("showing");
      if (options.skeletonKey) {
        recordRuntimeBlueprint(options.skeletonKey, b);
      }
      onMeasuredRef.current?.(b);
      if (baseEvent?.source === "dynamic") {
        onResolutionRef.current?.({
          ...baseEvent,
          reason: "dynamic-measured",
          measurementDurationMs: Math.max(Date.now() - measurementStartMs, 0),
        });
      }
    },
    [
      loading,
      contentRef,
      config,
      options.skeletonKey,
      options.include,
      options.exclude,
      measurementPolicy.budgetMs,
      isBlueprintValidForCachePolicy,
    ]
  );

  const scheduleMeasurement = useCallback(
    (baseEvent?: ResolutionEvent) => {
      clearScheduledMeasurement();

      if (measurementPolicy.mode === "manual") {
        return;
      }

      if (measurementPolicy.mode === "idle") {
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          idleCallbackRef.current = (
            window as Window & {
              requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number;
            }
          ).requestIdleCallback(
            () => {
              idleCallbackRef.current = null;
              void measure(baseEvent);
            },
            { timeout: 120 }
          );
          return;
        }

        timeoutRef.current = globalThis.setTimeout(() => {
          timeoutRef.current = null;
          void measure(baseEvent);
        }, 0);
        return;
      }

      if (measurementPolicy.mode === "viewport") {
        if (!contentRef.current || typeof IntersectionObserver === "undefined") {
          void measure(baseEvent);
          return;
        }

        intersectionObserverRef.current = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            clearScheduledMeasurement();
            void measure(baseEvent);
          }
        });
        intersectionObserverRef.current.observe(contentRef.current);
        return;
      }

      void measure(baseEvent);
    },
    [clearScheduledMeasurement, contentRef, measure, measurementPolicy.mode]
  );

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
        const hydratedBlueprint = options.hydrateBlueprint;
        if (hydratedBlueprint) {
          const invalidReason = validateHydratedBlueprint(hydratedBlueprint);
          if (!invalidReason) {
            setBlueprint(hydratedBlueprint);
            setPhase("showing");

            if (contentRef.current && hydratedBlueprint.structuralHash) {
              lastStructuralHashRef.current = hydratedBlueprint.structuralHash;
              blueprintCache.set(
                contentRef.current,
                hydratedBlueprint,
                hydratedBlueprint.structuralHash
              );
            }
            return;
          }

          options.onBlueprintInvalidated?.(invalidReason);
          setBlueprint(null);
          setPhase("measuring");
        }

        scheduleMeasurement(resolution.event);
      }
    } else {
      clearScheduledMeasurement();
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
    scheduleMeasurement,
    options.externalBlueprint,
    options.hydrateBlueprint,
    options.onBlueprintInvalidated,
    options.policyOverride,
    options.skeletonKey,
    validateHydratedBlueprint,
    config.transitionDuration,
  ]);

  useEffect(() => {
    return () => {
      clearScheduledMeasurement();
    };
  }, [clearScheduledMeasurement]);

  // Handle Resize
  useEffect(() => {
    if (options.remeasureOnResize && loading && contentRef.current && phase === "showing") {
      resizeObserverRef.current = new ResizeObserver(() => {
        void measure();
      });
      resizeObserverRef.current.observe(contentRef.current);
      return () => resizeObserverRef.current?.disconnect();
    }
  }, [options.remeasureOnResize, loading, contentRef, phase, measure]);

  // Inject Styles (idempotent)
  useEffect(() => {
    animationSystem.injectStyles(config);
  }, [config]);

  const measureNow = useCallback(() => {
    void measure();
  }, [measure]);

  return { blueprint, phase, measureNow };
}
