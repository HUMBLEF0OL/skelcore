import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_CAPTURE_CONFIG } from "./default-config";
import type { CaptureConfig } from "../types";

export async function resolveCaptureConfig(input: {
  rootDir: string;
  configPath?: string;
  inline?: Partial<CaptureConfig>;
}): Promise<CaptureConfig> {
  const fileConfig = input.configPath
    ? await loadConfigModule(path.resolve(input.rootDir, input.configPath))
    : {};

  const inlineConfig = stripUndefined(input.inline ?? {});

  const merged: CaptureConfig = {
    ...DEFAULT_CAPTURE_CONFIG,
    ...fileConfig,
    ...inlineConfig,
    routes: inlineConfig.routes ?? fileConfig.routes ?? [],
  };

  if (!merged.routes.length) {
    throw new Error("routes must contain at least one route");
  }

  return merged;
}

async function loadConfigModule(configFilePath: string): Promise<Partial<CaptureConfig>> {
  await fs.access(configFilePath);
  const mod = await import(pathToFileURL(configFilePath).href);
  return (mod.default ?? mod.captureConfig ?? {}) as Partial<CaptureConfig>;
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Partial<T> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key as keyof T] = value as T[keyof T];
    }
  }

  return output;
}
