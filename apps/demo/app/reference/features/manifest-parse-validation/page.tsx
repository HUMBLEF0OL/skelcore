"use client";

import React, { useMemo } from "react";
import { parseManifest } from "@ghostframe/ghostframe/runtime";
import { CodeBlock, FeatureCard } from "../../../../lib/demo-components";
import generatedManifest from "../../../../lib/ghostframe/generated/manifest-loader";

function prettyJson(value: unknown): string {
    if (!value) {
        return "None";
    }

    return JSON.stringify(value, null, 2);
}

export default function ManifestParseValidationFeaturePage() {
    const valid = useMemo(() => parseManifest(generatedManifest), []);
    const invalidWrongVersion = useMemo(
        () => parseManifest({ ...generatedManifest, manifestVersion: "bad", entries: null }),
        [],
    );
    const invalidMissingDefaults = useMemo(
        () => parseManifest({ ...generatedManifest, defaults: { ttlMs: -1 } }),
        [],
    );
    const validManifest = valid.manifest;
    const validEntryCount = validManifest ? Object.keys(validManifest.entries).length : 0;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Manifest Parse & Validation</h1>
                <p className="text-lg text-zinc-500 light:text-zinc-600">
                    Validate manifest shape and inspect parser diagnostics.
                </p>
            </header>

            <FeatureCard
                title="Parse Results"
                description="Compare expected success and failure cases"
                badge="parseManifest"
            >
                <div className="space-y-4 text-sm text-zinc-400 light:text-zinc-700">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 light:border-zinc-200 light:bg-zinc-50">
                        <p data-testid="manifest-parse-success" className="font-semibold text-emerald-400 light:text-emerald-700">
                            {valid.success ? "Valid manifest accepted" : "Valid manifest rejected"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 light:text-zinc-600">
                            Entries: {validEntryCount} | Version: {validManifest?.manifestVersion ?? "unknown"} | App: {validManifest?.build.appVersion ?? "unknown"}
                        </p>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 light:border-zinc-200 light:bg-zinc-50">
                        <p data-testid="manifest-parse-failure" className="font-semibold text-rose-400 light:text-rose-700">
                            {invalidWrongVersion.success ? "Invalid manifest accepted" : "Invalid manifest rejected"}
                        </p>
                        <p data-testid="manifest-parse-error-message" className="mt-1 text-xs text-zinc-500 light:text-zinc-600">
                            {invalidWrongVersion.error ?? "No parser error reported"}
                        </p>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 light:border-zinc-200 light:bg-zinc-50">
                        <p className="font-semibold text-rose-400 light:text-rose-700">
                            {invalidMissingDefaults.success ? "Invalid defaults accepted" : "Invalid defaults rejected"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 light:text-zinc-600">
                            {invalidMissingDefaults.error ?? "No parser error reported"}
                        </p>
                    </div>
                </div>
            </FeatureCard>

            <FeatureCard
                title="Diagnostics Payload"
                description="Inspect parser error details for invalid manifests"
                badge="errorDetails"
            >
                <CodeBlock code={prettyJson(invalidWrongVersion.errorDetails)} language="json" />
            </FeatureCard>
        </div>
    );
}