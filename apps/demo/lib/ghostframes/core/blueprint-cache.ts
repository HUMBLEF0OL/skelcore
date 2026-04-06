import type { Blueprint } from "./types";

type CacheEntry = {
  blueprint: Blueprint;
  structuralHash: string;
  timestamp: number;
};

/**
 * djb2 is a classic, extremely fast non-cryptographic hash function.
 * It's perfect for strings and has good distribution for structural keys.
 */
export function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generates a structural hash of a DOM subtree.
 * Includes tagName, childCount, and depth.
 * Ignores text content and attributes (except data-skeleton ones).
 */
export function computeStructuralHash(root: Element, maxDepth: number = 12): string {
  const parts: string[] = [];

  function walk(el: Element, depth: number) {
    if (depth > maxDepth) return;

    // Serialize node identity
    // Format: Tag:ChildrenCount:Depth
    parts.push(`${el.tagName}:${el.childElementCount}:${depth}`);

    const children = el.children;
    for (let i = 0; i < children.length; i++) {
      walk(children[i], depth + 1);
    }
  }

  walk(root, 0);
  return djb2(parts.join("|"));
}

export class BlueprintCache {
  // WeakMap ensures that when the root Element is unmounted and GC'd,
  // the associated Blueprint is also cleared from memory.
  private store = new WeakMap<Element, CacheEntry>();

  /**
   * Retrieves a cached blueprint if the structural hash matches.
   */
  get(el: Element, currentHash: string): Blueprint | null {
    const entry = this.store.get(el);
    if (!entry) return null;

    // If the structure changed, the cache is invalid.
    if (entry.structuralHash !== currentHash) {
      this.store.delete(el);
      return null;
    }

    return entry.blueprint;
  }

  /**
   * Stores a blueprint in the cache.
   */
  set(el: Element, blueprint: Blueprint, hash: string): void {
    this.store.set(el, {
      blueprint,
      structuralHash: hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Forcefully invalidates an element's cache.
   */
  invalidate(el: Element): void {
    this.store.delete(el);
  }
}

export const blueprintCache = new BlueprintCache();
