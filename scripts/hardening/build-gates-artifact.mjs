import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GATE_DEFINITIONS = [
    {
        name: "B1_PARITY_GATE",
        statusPrefix: "PARITY",
        description: "Capture Parity Baseline: >= 95% parity with deterministic reason codes",
        threshold: { parityRate: 0.95 },
        packageFilter: "@ghostframes/cli",
        packageDir: "packages/cli",
        testFile: "src/__tests__/parity.test.ts",
    },
    {
        name: "B2_DETERMINISM_GATE",
        statusPrefix: "DETERMINISM",
        description: "Deterministic Normalization: <= 1% unexpected diff over 20 repeated runs",
        threshold: { unexpectedDiffRate: 0.01 },
        packageFilter: "@ghostframes/cli",
        packageDir: "packages/cli",
        testFile: "src/__tests__/determinism.test.ts",
    },
    {
        name: "B3_BLUEPRINT_GATE",
        statusPrefix: "BLUEPRINT",
        description: "Blueprint quality gate enforces >= 0.90 threshold and >= 50% malformed fallback reduction",
        threshold: { qualityScore: 0.9, malformedFallbackReduction: 0.5 },
        packageFilter: "@ghostframes/cli",
        packageDir: "packages/cli",
        testFile: "src/__tests__/capture-command.test.ts",
    },
    {
        name: "B4_COMPATIBILITY_GATE",
        statusPrefix: "COMPATIBILITY",
        description: "Manifest compatibility matrix passes for supported versions",
        threshold: { compatibilityPassRate: 1.0 },
        packageFilter: "@ghostframes/core",
        packageDir: "packages/core",
        testFile: "src/__tests__/manifest-validator-b4-compat.test.ts",
    },
    {
        name: "B5_CONFIDENCE_GATE",
        statusPrefix: "CONFIDENCE",
        description: "Hybrid confidence gate requires hit/invalidation targets, no user-visible regression, and rollback drill <= 10m",
        threshold: {
            hitRatio: 0.75,
            invalidationRate: 0.05,
            maxUserVisibleRegressionDelta: 0,
            maxRollbackDrillDurationMs: 600000,
        },
        packageFilter: "@ghostframes/react",
        packageDir: "packages/react",
        testFile: "src/__tests__/resolver.test.ts",
    },
    {
        name: "B6_STRICT_GATE",
        statusPrefix: "STRICT",
        description: "Strict rollout requires <= 1% fallback anomaly, zero P0/P1 incidents, and two-window promotion evidence",
        threshold: { fallbackAnomalyRate: 0.01, p0Incidents: 0, p1Incidents: 0 },
        packageFilter: "@ghostframes/react",
        packageDir: "packages/react",
        testFile: "src/__tests__/strict-rollout.test.ts",
    },
];

function stripAnsi(value) {
    return value.replace(/\u001b\[[0-9;]*m/g, "");
}

async function runGateTest(rootDir, gate) {
    const packageDir = path.resolve(rootDir, gate.packageDir);
    const reportsDir = path.resolve(packageDir, ".tmp/ghostframes/gates");
    await fs.mkdir(reportsDir, { recursive: true });
    const reportPath = path.resolve(reportsDir, `${gate.name.toLowerCase()}.json`);

    const command =
        `pnpm exec vitest run --reporter=json --outputFile ".tmp/ghostframes/gates/${gate.name.toLowerCase()}.json" ${gate.testFile}`;

    const result = spawnSync(command, {
        cwd: packageDir,
        encoding: "utf8",
        shell: true,
    });

    const output = [result.stdout ?? "", result.stderr ?? ""].join("\n");
    const outputLines = output.split(/\r?\n/).map((line) => stripAnsi(line));
    const reportPathMatch = output.match(/JSON report written to\s+([^\r\n]+)/i);
    const resolvedReportPath = reportPathMatch?.[1]?.trim() || reportPath;

    let report = null;
    try {
        report = JSON.parse(await fs.readFile(resolvedReportPath, "utf8"));
    } catch {
        // Fall back to process status handling below.
    }

    const assertionResults = (report?.testResults ?? [])
        .flatMap((suite) => suite?.assertionResults ?? [])
        .filter((assertion) => assertion && typeof assertion.status === "string");

    const passedTestsFromReport = assertionResults
        .filter((assertion) => assertion.status === "passed")
        .map((assertion) => assertion.fullName || assertion.title)
        .filter(Boolean);

    const failedTestsFromReport = assertionResults
        .filter((assertion) => assertion.status === "failed")
        .map((assertion) => assertion.fullName || assertion.title)
        .filter(Boolean);

    const passedTestsFromStdout = outputLines
        .filter((line) => /^\s*✓\s+/.test(line))
        .map((line) => line.replace(/^\s*✓\s+/, "").trim())
        .filter(Boolean);

    const failedTestsFromStdout = outputLines
        .filter((line) => /^\s*[×x]\s+/.test(line))
        .map((line) => line.replace(/^\s*[×x]\s+/, "").trim())
        .filter(Boolean);

    const summaryLine = outputLines.find((line) => /^\s*Tests\s+/.test(line)) ?? "";
    const passedCountFromStdout = Number((summaryLine.match(/(\d+)\s+passed/) ?? [])[1] ?? NaN);
    const failedCountFromStdout = Number((summaryLine.match(/(\d+)\s+failed/) ?? [])[1] ?? NaN);

    const allPassed = (result.status ?? 1) === 0;
    const passedCountFromReport = Number(report?.numPassedTests ?? NaN);
    const failedCountFromReport = Number(report?.numFailedTests ?? NaN);

    const passedCount = Number.isFinite(passedCountFromReport)
        ? passedCountFromReport
        : Number.isFinite(passedCountFromStdout)
            ? passedCountFromStdout
            : passedTestsFromStdout.length;

    const failedCount = Number.isFinite(failedCountFromReport)
        ? failedCountFromReport
        : Number.isFinite(failedCountFromStdout)
            ? failedCountFromStdout
            : failedTestsFromStdout.length;

    const passedTests = passedTestsFromReport.length > 0 ? passedTestsFromReport : passedTestsFromStdout;
    const failedTests = failedTestsFromReport.length > 0 ? failedTestsFromReport : failedTestsFromStdout;

    return {
        passedTests,
        failedTests,
        passedCount,
        failedCount: failedCount || (!allPassed ? 1 : 0),
        allPassed,
        exitCode: result.status ?? 1,
    };
}

function getCurrentBranch(rootDir) {
    const git = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: rootDir,
        encoding: "utf8",
    });

    if ((git.status ?? 1) !== 0) {
        return "unknown";
    }

    return git.stdout.trim() || "unknown";
}

async function main() {
    const rootDir = path.resolve(__dirname, "../..");
    const executedAt = new Date().toISOString();
    const targetBranch = getCurrentBranch(rootDir);

    const rawGateResults = [];
    for (const gate of GATE_DEFINITIONS) {
        const result = await runGateTest(rootDir, gate);
        rawGateResults.push({ gate, result });
    }

    const gates = [];
    let previousPassed = true;

    for (const { gate, result } of rawGateResults) {
        let state = "PASS";

        if (!previousPassed) {
            state = "BLOCKED";
        } else if (!result.allPassed) {
            state = "FAIL";
            previousPassed = false;
        }

        if (state === "PASS") {
            previousPassed = true;
        }

        gates.push({
            name: gate.name,
            status: `${gate.statusPrefix}_${state}`,
            description: gate.description,
            testFile: `${gate.packageDir}/${gate.testFile}`,
            testCount: result.passedCount + result.failedCount,
            allPassed: state === "PASS" && result.allPassed,
            threshold: gate.threshold,
            evidence: {
                exitCode: result.exitCode,
                passedTestCount: result.passedCount,
                failedTestCount: result.failedCount,
                testResults: result.passedTests,
                failedTests: result.failedTests,
            },
        });
    }

    const firstNonPass = gates.find((gate) => !gate.allPassed);
    const totalTestsPassed = gates.reduce((sum, gate) => sum + gate.evidence.passedTestCount, 0);
    const totalTestsFailed = gates.reduce((sum, gate) => sum + gate.evidence.failedTestCount, 0);
    const allPass = gates.every((gate) => gate.allPassed);

    const artifact = {
        executedAt,
        targetBranch,
        gates,
        totalTestsPassed,
        totalTestsFailed,
        gatesBlocking: GATE_DEFINITIONS.map((gate) => gate.name),
        gatesStatus: allPass ? "ALL_PASS" : "BLOCKED",
        nextGate: firstNonPass?.name ?? null,
        readyForPromotion: allPass,
    };

    const outputDir = path.resolve(rootDir, ".test-results");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.resolve(outputDir, "gates.json");
    await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

    if (!allPass) {
        const nextGate = firstNonPass?.name ?? "unknown";
        console.error(`Gate progression is blocked at ${nextGate}. See ${outputPath}.`);
        process.exit(1);
    }

    console.log(`All gates B1-B6 passed. Artifact written to ${outputPath}.`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
