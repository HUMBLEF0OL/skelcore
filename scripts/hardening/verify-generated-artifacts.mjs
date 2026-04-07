import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const generatedDir = path.resolve(rootDir, "apps/demo/lib/ghostframes/generated");
const manifestPath = path.resolve(generatedDir, "manifest.json");
const loaderPath = path.resolve(generatedDir, "manifest-loader.ts");
const parityPath = path.resolve(generatedDir, "parity-report.json");

async function ensureFile(filePath) {
    try {
        await fs.access(filePath);
    } catch {
        throw new Error(`Missing required generated artifact: ${filePath}`);
    }
}

async function main() {
    await ensureFile(manifestPath);
    await ensureFile(loaderPath);
    await ensureFile(parityPath);

    const manifestRaw = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);

    if (typeof manifest !== "object" || manifest === null) {
        throw new Error("Invalid manifest.json: expected object payload");
    }

    if (!manifest.entries || typeof manifest.entries !== "object") {
        throw new Error("Invalid manifest.json: expected entries object");
    }

    const parityRaw = await fs.readFile(parityPath, "utf8");
    const parityReport = JSON.parse(parityRaw);

    const parityRate = Number(parityReport?.parityRate);
    const minThreshold = Number(parityReport?.minThreshold);
    const passed = Boolean(parityReport?.passed);

    if (!Number.isFinite(parityRate) || !Number.isFinite(minThreshold)) {
        throw new Error("Invalid parity-report.json: expected numeric parityRate and minThreshold");
    }

    if (!passed || parityRate < minThreshold) {
        throw new Error(
            `Invalid parity-report.json: parity gate failed (${(parityRate * 100).toFixed(2)}% < ${(minThreshold * 100).toFixed(2)}%)`
        );
    }

    console.log("Verified generated skeleton artifacts: manifest, loader, parity-report.");
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
