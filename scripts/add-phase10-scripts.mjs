import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const packageJsonPath = path.resolve(__dirname, "../package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

    // Add Phase 10 scripts
    packageJson.scripts["rollout:test"] =
        "pnpm --filter @ghostframe/cli test -- src/rollout/__tests__/";
    packageJson.scripts["rollout:status"] =
        "pnpm --filter @ghostframe/cli build && node scripts/rollout/status.mjs";
    packageJson.scripts["rollout:ready"] =
        "pnpm --filter @ghostframe/cli test -- src/rollout/__tests__/ && pnpm --filter @ghostframe/cli typecheck && pnpm --filter @ghostframe/cli build && pnpm --filter demo typecheck";

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");

    console.log("✓ Added Phase 10 scripts to package.json");
    console.log("  - rollout:test");
    console.log("  - rollout:status");
    console.log("  - rollout:ready");
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
