import fs from "node:fs/promises";
import path from "node:path";
import { parseManifest } from "@ghostframe/core";
import { runBrowserCapture } from "../capture/browser-engine";
import { resolveCaptureConfig } from "../config/capture-config";
import { buildManifestDocument, renderManifestJson } from "../emit/manifest-writer";
import { renderManifestLoader } from "../emit/loader-writer";
import { buildCaptureReport, renderCaptureReport } from "../emit/report-writer";
import type { CaptureConfig, CaptureRunResult, CliIo } from "../types";

interface CaptureArgs {
  configPath?: string;
  baseUrl?: string;
}

interface CaptureDeps {
  runCapture: (config: CaptureConfig) => Promise<CaptureRunResult>;
}

const defaultDeps: CaptureDeps = {
  runCapture: runBrowserCapture,
};

export async function runCaptureCommand(
  argv: string[],
  io: CliIo,
  deps: CaptureDeps = defaultDeps
): Promise<number> {
  const args = parseArgs(argv);

  try {
    const rootDir = process.cwd();
    const config = await resolveCaptureConfig({
      rootDir,
      configPath: args.configPath,
      inline: {
        baseUrl: args.baseUrl,
      },
    });

    const captureResult = await deps.runCapture(config);
    if (!captureResult.ok) {
      io.error(captureResult.fatalError ?? "capture failed");
      return 1;
    }

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: captureResult.artifacts,
    });

    const parsed = parseManifest(manifest);
    if (!parsed.success) {
      io.error(`Manifest validation failed: ${parsed.error ?? "unknown error"}`);
      return 1;
    }

    const outputDir = path.resolve(rootDir, config.outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    const manifestPath = path.resolve(outputDir, config.manifestFileName);
    const loaderPath = path.resolve(outputDir, config.loaderFileName);
    const reportPath = path.resolve(outputDir, "capture-report.txt");
    const manifestJson = renderManifestJson(manifest, {
      prettyPrint: config.prettyPrintManifest !== false,
    });
    const manifestBytes = Buffer.byteLength(manifestJson, "utf8");

    await fs.writeFile(manifestPath, manifestJson, "utf8");
    await fs.writeFile(loaderPath, renderManifestLoader(manifest), "utf8");

    const report = buildCaptureReport(config, captureResult.artifacts, { manifestBytes });
    await fs.writeFile(reportPath, renderCaptureReport(report), "utf8");

    io.log(`Capture complete: ${captureResult.artifacts.length} artifacts`);
    io.log(`Manifest size: ${manifestBytes} bytes`);
    io.log(`Manifest: ${manifestPath}`);
    io.log(`Loader: ${loaderPath}`);
    return 0;
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): CaptureArgs {
  const parsed: CaptureArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      parsed.configPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--baseUrl") {
      parsed.baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return parsed;
}
