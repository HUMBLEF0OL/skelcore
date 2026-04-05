"use client";

import React, { useState } from "react";
import {
    AutoSkeleton,
    asStructuralHash,
    type BlueprintManifest,
    type ResolutionEvent,
} from "@ghostframe/ghostframe";

// Mock manifest for demo (would be loaded from server in real app)
const mockManifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: {
        builtAt: Date.now(),
        appVersion: "1.0.0",
        commitSha: "demo123abc",
    },
    defaults: { ttlMs: 86400000 },
    entries: {
        ProductCard: {
            key: "ProductCard",
            blueprint: {
                version: 1,
                rootWidth: 300,
                rootHeight: 200,
                nodes: [],
                generatedAt: Date.now(),
                source: "dynamic",
            },
            structuralHash: asStructuralHash("demo_hash_123"),
            generatedAt: Date.now(),
            ttlMs: 86400000,
            quality: { confidence: 0.95, warnings: [] },
        },
    },
};

function ProductCard() {
    return (
        <div
            style={{
                width: 300,
                height: 200,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                padding: 12,
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: 100,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: 4,
                    marginBottom: 12,
                }}
            />
            <div
                style={{ height: 16, background: "#333", marginBottom: 8, borderRadius: 2, width: "80%" }}
            />
            <div style={{ height: 14, background: "#666", borderRadius: 2, width: "60%" }} />
        </div>
    );
}

export default function TestPage(): React.ReactElement {
    const [loading, setLoading] = useState(true);
    const [policyMode, setPolicyMode] = useState<"runtime-only" | "hybrid" | "precomputed-only">(
        "hybrid"
    );
    const [resolutionEvents, setResolutionEvents] = useState<ResolutionEvent[]>([]);

    React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleResolution = (event: ResolutionEvent) => {
        setResolutionEvents((prev) => [event, ...prev.slice(0, 9)]);
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 8 }}>Phase 2: Manifest & Policy Demo</h1>
            <p style={{ color: "#666", marginBottom: 24 }}>
                Test precomputed manifest resolution with different policy modes
            </p>

            <div
                style={{
                    background: "#f5f5f5",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 24,
                    borderLeft: "4px solid #667eea",
                }}
            >
                <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>Policy Mode:</label>
                <div style={{ display: "flex", gap: 16 }}>
                    {(["runtime-only", "hybrid", "precomputed-only"] as const).map((mode) => (
                        <label key={mode} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="radio"
                                checked={policyMode === mode}
                                onChange={() => setPolicyMode(mode)}
                                style={{ cursor: "pointer" }}
                            />
                            <span style={{ cursor: "pointer" }}>{mode}</span>
                        </label>
                    ))}
                </div>
                <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
                    [1] runtime-only: Measure DOM dynamically, ignore manifest
                    <br />
                    [2] hybrid: Try manifest first, fall back to dynamic measurement
                    <br />
                    [3] precomputed-only: Use manifest only, fail if not available
                </p>
            </div>

            <div style={{ marginBottom: 32 }}>
                <h2 style={{ marginBottom: 16 }}>Component with Manifest</h2>
                <AutoSkeleton
                    loading={loading}
                    skeletonKey="ProductCard"
                    manifest={mockManifest}
                    policyOverride={{ mode: policyMode }}
                    onResolution={handleResolution}
                >
                    <ProductCard />
                </AutoSkeleton>
            </div>

            <div
                style={{
                    background: "#f9f9f9",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                }}
            >
                <h3 style={{ marginBottom: 12 }}>Resolution Events</h3>
                {resolutionEvents.length === 0 ? (
                    <p style={{ color: "#999" }}>No events yet</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {resolutionEvents.map((event, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: 8,
                                    background: "#fff",
                                    border: "1px solid #eee",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: "monospace",
                                }}
                            >
                                <span style={{ color: "#667eea", fontWeight: 500 }}>{event.source}</span> |{" "}
                                {event.reason}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div
                style={{
                    background: "#e3f2fd",
                    border: "1px solid #90caf9",
                    borderRadius: 8,
                    padding: 16,
                    marginTop: 24,
                    fontSize: 14,
                }}
            >
                <strong>About this demo:</strong>
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                    <li>The component loads with a 2-second delay to simulate async content</li>
                    <li>The manifest entry is checked before dynamic measurement based on policy mode</li>
                    <li>Resolution events are logged showing which source was used (manifest vs dynamic)</li>
                    <li>
                        In production, manifests would be precomputed at build time and served from your
                        CDN/server
                    </li>
                </ul>
            </div>

            <div style={{ marginTop: 24 }}>
                <button
                    onClick={() => setLoading(!loading)}
                    style={{
                        padding: "10px 20px",
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                    }}
                >
                    Toggle Loading ({loading ? "loading" : "loaded"})
                </button>
            </div>
        </div>
    );
}
