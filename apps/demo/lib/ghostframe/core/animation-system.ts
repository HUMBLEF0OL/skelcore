import { DEFAULT_CONFIG, type SkeletonConfig } from "./types";

export class AnimationSystem {
  private styleTag: HTMLStyleElement | null = null;
  private currentConfigHash: string = "";

  /**
   * Injects the required CSS for shimmer and pulse animations into the document head.
   * This is idempotent and only updates if the config affecting visual variables changes.
   */
  injectStyles(config: SkeletonConfig = DEFAULT_CONFIG): void {
    if (typeof document === "undefined") return;

    // Validate speed: must be positive and greater than 0 to avoid division by zero or negative durations
    // Use ?? instead of || to allow explicit 0 to be clamped (not hidden by default)
    const validatedSpeed = Math.max(0.1, config.speed ?? 1);

    const configHash = `${config.baseColor}-${config.highlightColor}-${config.speed}-${config.borderRadius}-${config.animation}`;
    if (this.styleTag && this.currentConfigHash === configHash) return;

    if (!this.styleTag) {
      this.styleTag = document.createElement("style");
      this.styleTag.id = "ghostframe-animations";
      document.head.appendChild(this.styleTag);
    }

    this.currentConfigHash = configHash;
    this.styleTag.textContent = this.generateCSS(config, validatedSpeed);
  }

  /**
   * Generates the CSS string containing variables, keyframes, and utility classes.
   * Speed is pre-validated to ensure no division by zero or negative durations.
   * Animation mode is enforced: "none" produces no animated keyframes.
   */
  private generateCSS(config: SkeletonConfig, validatedSpeed: number): string {
    const shimmerDuration = 2 / validatedSpeed;
    const pulseDuration = 1.5 / validatedSpeed;

    // Build keyframes conditionally based on animation mode
    let keyframesCSS = "";
    if (config.animation === "shimmer") {
      keyframesCSS = `
@keyframes skel-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;
    } else if (config.animation === "pulse") {
      keyframesCSS = `
@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;
    }
    // For "none" mode, no keyframes are emitted

    // Build animation classes conditionally based on mode
    let animationClassesCSS: string;
    if (config.animation === "shimmer") {
      animationClassesCSS = `
.skel-shimmer {
  background: linear-gradient(
    90deg,
    var(--skel-base) 25%,
    var(--skel-highlight) 50%,
    var(--skel-base) 75%
  );
  background-size: 200% 100%;
  animation: skel-shimmer ${shimmerDuration}s infinite linear;
}

.skel-pulse {
  opacity: 0.7;
}
`;
    } else if (config.animation === "pulse") {
      animationClassesCSS = `
.skel-shimmer {
  background: var(--skel-base);
}

.skel-pulse {
  animation: skel-pulse ${pulseDuration}s infinite ease-in-out;
}
`;
    } else {
      // Mode "none": static styles only
      animationClassesCSS = `
.skel-shimmer {
  background: linear-gradient(
    90deg,
    var(--skel-base) 25%,
    var(--skel-highlight) 50%,
    var(--skel-base) 75%
  );
}

.skel-pulse {
  opacity: 0.7;
}
`;
    }

    return `
:root {
  --skel-base: ${config.baseColor};
  --skel-highlight: ${config.highlightColor};
  --skel-radius: ${config.borderRadius}px;
}

${keyframesCSS}
/* Reset visibility for opted-out children */
.skel-content[data-loading="true"] [data-no-skeleton],
.skel-content[data-loading="true"] [data-skeleton-ignore] {
  position: relative;
  z-index: 11;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.skel-block {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--skel-radius);
  background-color: var(--skel-base);
  position: relative;
  overflow: hidden;
}

${animationClassesCSS}
/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .skel-shimmer, .skel-pulse {
    animation: none !important;
    opacity: 0.7 !important;
  }
}
    `.trim();
  }

  /**
   * Removes the style tag from the document head.
   */
  removeStyles(): void {
    if (this.styleTag && this.styleTag.parentNode) {
      this.styleTag.parentNode.removeChild(this.styleTag);
      this.styleTag = null;
      this.currentConfigHash = "";
    }
  }
}

export const animationSystem = new AnimationSystem();
