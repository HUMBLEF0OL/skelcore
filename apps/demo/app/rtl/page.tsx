"use client";

import React, { useState } from "react";
import { FeatureCard } from "../../lib/demo-components";
import { AutoSkeleton } from "../../lib/skelcore/react";

function RtlContent() {
    return (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
            <h2 className="text-2xl font-bold text-white light:text-zinc-900">مرحبا بكم في عرض SkelCore</h2>
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

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">RTL Layout Demo</h1>
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

                    <button
                        data-no-skeleton
                        data-testid="rtl-noskel-button"
                        onClick={() => setClickCount((value) => value + 1)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:text-zinc-700"
                    >
                        data-no-skeleton click target
                    </button>

                    <p className="text-sm text-zinc-500 light:text-zinc-600">
                        Click count: <span data-testid="rtl-noskel-count" className="font-mono">{clickCount}</span>
                    </p>
                </div>
            </FeatureCard>

            <FeatureCard title="RTL Target" description="Skeletonized content rendered in right-to-left mode">
                <div dir="rtl" className="space-y-4">
                    <AutoSkeleton loading={loading}>
                        <RtlContent />
                    </AutoSkeleton>
                </div>
            </FeatureCard>
        </main>
    );
}
