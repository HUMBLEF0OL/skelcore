"use client";

import React, { useState } from "react";
import { FeatureCard } from "../../lib/demo-components";
import { AutoSkeleton } from "../../lib/ghostframe/react";

function RtlContent() {
    return (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
            <h2 className="text-2xl font-bold text-white light:text-zinc-900">مرحبا بكم في عرض Ghostframe</h2>
            <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
                هذا النص يستخدم تخطيط من اليمين إلى اليسار لاختبار تموضع عناصر الهيكل العظمي ومطابقة الاتجاه.
            </p>
            <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
                Skeleton blocks should align with RTL text flow and preserve readability during loading.
            </p>
        </div>
    );
}

export default function RtlPage() {
    const [loading, setLoading] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickAt, setLastClickAt] = useState<string | null>(null);

    const registerClick = () => {
        setClickCount((value) => value + 1);
        setLastClickAt(new Date().toLocaleTimeString());
    };

    return (
        <div className="app-surface guide-page">
            <main className="app-content guide-flow">
                <header className="guide-header">
                    <h1 className="guide-title font-bold text-white light:text-zinc-900">RTL Layout Demo</h1>
                    <p className="text-zinc-500 light:text-zinc-600">
                        Validates mirrored skeleton alignment while keeping opted-out controls interactive.
                    </p>
                </header>

                <FeatureCard title="Controls" description="Toggle loading and click the data-no-skeleton button" badge="RTL Validation">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setLoading((value) => !value)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                        >
                            {loading ? "Stop Loading" : "Start Loading"}
                        </button>

                        <p className="text-sm text-zinc-500 light:text-zinc-600">
                            Click count: <span data-testid="rtl-noskel-count" className="font-mono">{clickCount}</span>
                        </p>
                    </div>

                    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs light:border-zinc-200 light:bg-zinc-50">
                        <p data-testid="rtl-loading-status" className="font-semibold text-zinc-300 light:text-zinc-700">
                            {loading
                                ? "Loading active: the data-no-skeleton target remains interactive"
                                : "Loading paused: both controls are visible and interactive"}
                        </p>
                        <p className="mt-1 text-zinc-500 light:text-zinc-600">
                            Last click timestamp: {lastClickAt ?? "none"}
                        </p>
                    </div>
                </FeatureCard>

                <FeatureCard title="RTL Target" description="Skeletonized content rendered in right-to-left mode">
                    <div dir="rtl" className="space-y-4">
                        <AutoSkeleton loading={loading}>
                            <div className="space-y-3">
                                <RtlContent />
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        data-no-skeleton
                                        data-testid="rtl-noskel-button"
                                        onClick={registerClick}
                                        className="rounded-lg border border-emerald-600/60 bg-emerald-600/10 px-4 py-2 text-sm text-emerald-300 transition-colors hover:border-emerald-500 light:border-emerald-300 light:bg-emerald-50 light:text-emerald-700"
                                    >
                                        data-no-skeleton target
                                    </button>
                                    <button
                                        onClick={registerClick}
                                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:text-zinc-700"
                                    >
                                        regular target
                                    </button>
                                </div>
                            </div>
                        </AutoSkeleton>
                    </div>
                </FeatureCard>
            </main>
        </div>
    );
}
