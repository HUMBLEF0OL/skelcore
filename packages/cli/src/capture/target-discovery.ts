import type { Page } from "playwright";

export interface CaptureTarget {
  key: string;
  selector: string;
}

export async function discoverTargets(page: Page, selector: string): Promise<CaptureTarget[]> {
  const discovered = await page.$$eval(selector, (elements) => {
    return elements
      .map((element) => {
        const key = element.getAttribute("data-skeleton-key")?.trim() ?? "";
        if (!key) {
          return null;
        }

        return {
          key,
          selector: `[data-skeleton-key="${key}"]`,
        };
      })
      .filter((value): value is { key: string; selector: string } => Boolean(value));
  });

  const unique = new Map<string, CaptureTarget>();
  for (const item of discovered) {
    if (!unique.has(item.key)) {
      unique.set(item.key, item);
    }
  }

  return Array.from(unique.values());
}
