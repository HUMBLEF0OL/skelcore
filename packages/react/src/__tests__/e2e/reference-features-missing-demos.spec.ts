import { expect, test } from "@playwright/test";

test.describe("Reference features missing demos", () => {
  test("fallback overlay is shown only during measuring phase", async ({ page }) => {
    await page.goto("/reference/features/fallback");

    await page.getByRole("button", { name: /start loading/i }).click();

    const fallback = page.getByTestId("fallback-preview");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText(/custom fallback preview/i);
    await expect(page.getByRole("button", { name: /stop loading/i })).toBeVisible();

    await page.getByRole("button", { name: /stop loading/i }).click();
    await expect(fallback).toBeHidden();
  });

  test("resolver policy demo visibly reports selected mode and resolution outcome", async ({
    page,
  }) => {
    await page.goto("/reference/features/resolver-policy");

    await expect(page.getByRole("button", { name: "runtime-only" })).toBeVisible();
    await expect(page.getByRole("button", { name: "hybrid" })).toBeVisible();
    await expect(page.getByRole("button", { name: "precomputed-only" })).toBeVisible();

    await page.getByRole("button", { name: "precomputed-only" }).click();
    await page.getByRole("button", { name: /toggle loading/i }).click();
    await page.getByRole("button", { name: /toggle loading/i }).click();

    await expect(page.getByTestId("resolver-event-count")).toContainText(
      /^[1-9]\d* events captured$/
    );
    await expect(page.getByTestId("resolver-last-mode")).toHaveText("precomputed-only");
    await expect(page.getByTestId("resolver-last-source")).toContainText(/manifest|dynamic/i);
  });

  test("rollout telemetry collector visualizes non-empty snapshots and ratios", async ({
    page,
  }) => {
    await page.goto("/reference/features/fallback");
    await page.getByRole("button", { name: /start loading/i }).click();
    await page.getByRole("button", { name: /stop loading/i }).click();

    await page.goto("/reference/features/rollout-telemetry");

    await expect(page.getByTestId("telemetry-snapshot-count")).toContainText(
      /^Snapshots:\s*[1-9]\d*$/
    );
    await expect(page.getByTestId("telemetry-latest-route")).toContainText(/\/reference\//i);
    await expect(page.getByTestId("telemetry-manifest-hit-ratio")).toContainText(
      /^Manifest hit ratio:\s*\d+%$/
    );
    await expect(page.getByTestId("telemetry-fallback-ratio")).toContainText(
      /^Fallback ratio:\s*\d+%$/
    );
  });

  test("manifest validation demo accepts valid input and rejects invalid input", async ({
    page,
  }) => {
    await page.goto("/reference/features/manifest-parse-validation");

    await expect(page.getByTestId("manifest-parse-success")).toHaveText("Valid manifest accepted");
    await expect(page.getByTestId("manifest-parse-failure")).toHaveText(
      "Invalid manifest rejected"
    );
    await expect(page.getByTestId("manifest-parse-success")).not.toContainText(/rejected/i);
    await expect(page.getByTestId("manifest-parse-failure")).not.toContainText(/accepted/i);
  });
});
