"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateDynamicBlueprint,
  blueprintCache,
  animationSystem,
  computeStructuralHash,
  DEFAULT_CONFIG,
  type Blueprint,
  type ElementMatcher,
  type SkeletonConfig,
} from "@skelcore/core";

export type SkeletonPhase = "idle" | "measuring" | "showing" | "exiting";

type BlueprintSource = "client" | "server" | "cache";

type BlueprintInvalidationReason =
  | "missing-root"
  | "missing-structural-hash"
  | "version-mismatch"
  | "structural-hash-mismatch";

type MeasurementPolicy = {
  mode: "eager" | "idle" | "viewport" | "manual";
  budgetMs?: number;
};

type BlueprintCachePolicy = {
  ttlMs?: number;
  version?: number;
};

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
  } = {}
) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(() => {
    if (options.externalBlueprint) return options.externalBlueprint;
    if (options.blueprintSource === "client" && options.hydrateBlueprint) {
      return options.hydrateBlueprint;
    }

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

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onMeasuredRef.current = options.onMeasured;
  }, [options.onMeasured]);

  useEffect(() => {
    blueprintRef.current = blueprint;
  }, [blueprint]);

  const invalidateHydratedBlueprint = useCallback(
    (reason: BlueprintInvalidationReason) => {
      options.onBlueprintInvalidated?.(reason);
      setBlueprint(null);
      setPhase("measuring");
    },
    [options.onBlueprintInvalidated]
  );

  const hydrateBlueprint = options.hydrateBlueprint;
  const blueprintSource = options.blueprintSource ?? "client";
  const measurementPolicy = options.measurementPolicy ?? { mode: "eager" as const };
  const cachePolicy = options.blueprintCachePolicy;

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

  const measure = useCallback(async () => {
    if (!contentRef.current || !loading) return;
    const include = options.include ?? [];
    const exclude = options.exclude ?? [];
    const hasMatcherControls = include.length > 0 || exclude.length > 0;

    const runId = ++measureRunIdRef.current;
    setPhase("measuring");

    const existingHash = lastStructuralHashRef.current;
    if (existingHash && !hasMatcherControls) {
      const cached = blueprintCache.get(contentRef.current, existingHash);
      if (cached && isBlueprintValidForCachePolicy(cached)) {
        setBlueprint(cached);
        setPhase("showing");
        onMeasuredRef.current?.(cached);
        return;
      }

      if (cached) {
        blueprintCache.invalidate(contentRef.current);
      }
    }

    // Cache miss: measure once, then reuse the returned structural hash.
    const analyzerOptions: { include?: ElementMatcher[]; exclude?: ElementMatcher[] } = {
      include,
      exclude,
    };

    if (measurementPolicy.budgetMs !== undefined) {
      (analyzerOptions as { budgetMs?: number }).budgetMs = measurementPolicy.budgetMs;
    }

    const b = await generateDynamicBlueprint(contentRef.current, config, analyzerOptions);
    if (runId !== measureRunIdRef.current || !loadingRef.current) {
      return;
    }

    // Keep the currently rendered skeleton if a re-measure temporarily yields no nodes.
    if (b.nodes.length === 0 && blueprintRef.current) {
      setPhase("showing");
      return;
    }

    const structuralHash = b.structuralHash;

    if (structuralHash && !hasMatcherControls) {
      lastStructuralHashRef.current = structuralHash;
      blueprintCache.set(contentRef.current, b, structuralHash);
    }

    setBlueprint(b);
    setPhase("showing");
    onMeasuredRef.current?.(b);
  }, [
    loading,
    contentRef,
    config,
    options.include,
    options.exclude,
    measurementPolicy.budgetMs,
    isBlueprintValidForCachePolicy,
  ]);

  const scheduleMeasure = useCallback(() => {
    clearScheduledMeasurement();

    if (!loading || !contentRef.current) return;

    if (measurementPolicy.mode === "manual") return;

    if (measurementPolicy.mode === "eager") {
      void measure();
      return;
    }

    if (measurementPolicy.mode === "idle") {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleCallbackRef.current = (
          window as Window & { requestIdleCallback: (cb: () => void) => number }
        ).requestIdleCallback(() => {
          idleCallbackRef.current = null;
          void measure();
        });
      } else {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          void measure();
        }, 16);
      }
      return;
    }

    if (measurementPolicy.mode === "viewport") {
      if (typeof IntersectionObserver === "undefined") {
        void measure();
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          intersectionObserverRef.current = null;
          void measure();
        }
      });

      intersectionObserverRef.current = observer;
      observer.observe(contentRef.current);
      return;
    }

    void measure();
  }, [clearScheduledMeasurement, contentRef, loading, measure, measurementPolicy.mode]);

  const measureNow = useCallback(() => {
    clearScheduledMeasurement();
    return measure();
  }, [clearScheduledMeasurement, measure]);

  const validateHydratedBlueprint = useCallback(
    (candidate: Blueprint) => {
      if (!contentRef.current) {
        return { valid: false as const, reason: "missing-root" as const };
      }

      const expectedVersion = cachePolicy?.version ?? 1;
      if (candidate.version !== expectedVersion || !isBlueprintValidForCachePolicy(candidate)) {
        return { valid: false as const, reason: "version-mismatch" as const };
      }

      if (!candidate.structuralHash) {
        return { valid: false as const, reason: "missing-structural-hash" as const };
      }

      const currentHash = computeStructuralHash(contentRef.current, config.maxDepth);
      if (currentHash !== candidate.structuralHash) {
        return { valid: false as const, reason: "structural-hash-mismatch" as const };
      }

      return { valid: true as const };
    },
    [contentRef, cachePolicy?.version, config.maxDepth, isBlueprintValidForCachePolicy]
  );

  // Initial Measurement and Loading Toggle
  useEffect(() => {
    if (loading) {
      if (hydrateBlueprint && blueprintSource !== "client") {
        const validation = validateHydratedBlueprint(hydrateBlueprint);

        if (validation.valid) {
          setBlueprint(hydrateBlueprint);
          setPhase("showing");
          return;
        }

        invalidateHydratedBlueprint(validation.reason);
        scheduleMeasure();
        return;
      }

      if (options.externalBlueprint) {
        setBlueprint(options.externalBlueprint);
        setPhase("showing");
      } else {
        scheduleMeasure();
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
    clearScheduledMeasurement,
    loading,
    scheduleMeasure,
    options.externalBlueprint,
    hydrateBlueprint,
    blueprintSource,
    validateHydratedBlueprint,
    invalidateHydratedBlueprint,
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

  return { blueprint, phase, measureNow };
}
