import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const rootDir = path.resolve(__dirname, "../..");
    const reportPath = path.resolve(rootDir, "apps/demo/lib/ghostframes/generated/parity-report.json");

    let report;
    try {
        const raw = await fs.readFile(reportPath, "utf8");
        report = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Parity gate requires ${reportPath}. Run capture and commit parity-report.json before merging.`
        );
    }

    const parityRate = Number(report?.parityRate);
    const minThreshold = Number(report?.minThreshold);
    const passed = Boolean(report?.passed);

    if (!Number.isFinite(parityRate) || !Number.isFinite(minThreshold)) {
        throw new Error("Parity report is invalid: expected numeric parityRate and minThreshold");
    }

    if (!passed || parityRate < minThreshold) {
        throw new Error(
            `Parity gate failed in artifact: ${(parityRate * 100).toFixed(2)}% < ${(minThreshold * 100).toFixed(2)}%`
        );
    }

    const outDir = path.resolve(rootDir, ".tmp/ghostframes");
    await fs.mkdir(outDir, { recursive: true });
    const summaryPath = path.resolve(outDir, "parity-gate.json");
    const summary = {
        generatedAt: new Date().toISOString(),
        reportPath,
        parityRate,
        minThreshold,
        passed,
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

    console.log(
        `Parity gate passed: ${(parityRate * 100).toFixed(2)}% >= ${(minThreshold * 100).toFixed(2)}%`
    );
    console.log(`Parity summary: ${summaryPath}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
