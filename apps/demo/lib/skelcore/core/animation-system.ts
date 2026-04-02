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

    const configHash = `${config.baseColor}-${config.highlightColor}-${config.speed}-${config.borderRadius}`;
    if (this.styleTag && this.currentConfigHash === configHash) return;

    if (!this.styleTag) {
      this.styleTag = document.createElement("style");
      this.styleTag.id = "skelcore-animations";
      document.head.appendChild(this.styleTag);
    }

    this.currentConfigHash = configHash;
    this.styleTag.textContent = this.generateCSS(config);
  }

  /**
   * Generates the CSS string containing variables, keyframes, and utility classes.
   */
  private generateCSS(config: SkeletonConfig): string {
    const speed = config.speed || 1;
    const shimmerDuration = 2 / speed;
    const pulseDuration = 1.5 / speed;

    return `
:root {
  --skel-base: ${config.baseColor};
  --skel-highlight: ${config.highlightColor};
  --skel-radius: ${config.borderRadius}px;
}

@keyframes skel-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Reset visibility for opted-out children */
.skel-content[data-loading="true"] [data-no-skeleton] {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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

.skel-shimmer {
  background: linear-gradient(
    90deg,
    var(--skel-base) 25%,
    var(--skel-highlight) 50%,
    var(--skel-base) 75%
  );
  background-size: 200% 100%;
  animation: skel-shimmer ${shimmerDuration}s infinite linear;
  will-change: background-position;
}

.skel-pulse {
  animation: skel-pulse ${pulseDuration}s infinite ease-in-out;
  will-change: opacity;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .skel-shimmer, .skel-pulse {
    animation: none !important;
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
