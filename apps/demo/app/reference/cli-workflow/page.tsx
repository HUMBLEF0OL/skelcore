import { CodeBlock, FeatureCard } from "../../../lib/demo-components";

const workflowCommands = `# 1) Capture fresh skeleton artifacts
pnpm capture:demo

# 2) Validate quality thresholds
pnpm quality:validate

# 3) Compare baseline vs candidate manifests
pnpm quality:diff

# 4) Build a combined report for CI dashboards
pnpm quality:report

# 5) Run the full gate sequence
pnpm quality:gate`;

const buildLayerCommands = `# Build layer (local + CI build jobs)
# Generates skeleton artifacts after package builds
pnpm build

# Developer-focused generation while iterating
pnpm skeleton:generate:dev

# Skip auto-generation when needed
SKEL_SKIP_GENERATION=true pnpm build`;

const ciLayerCommands = `# CI validation layer (no artifact generation)
# Structural artifact sanity
pnpm quality:verify-artifacts

# Full quality and promotion gates
pnpm quality:gate`;

const deployLayerCommands = `# Deploy layer sanity (fast checks only)
pnpm deploy:sanity

# Deploy should consume already-verified artifacts:
# apps/demo/lib/ghostframes/generated/manifest.json
# apps/demo/lib/ghostframes/generated/manifest-loader.ts
# apps/demo/lib/ghostframes/generated/parity-report.json`;

const demoRunbookCommands = `# Terminal A: run demo app
pnpm --filter demo dev

# Terminal B: generate artifacts and validate
pnpm skeleton:generate:dev
pnpm quality:verify-artifacts
pnpm quality:gate`;

const rolloutEnvTemplate = `# Runtime policy toggles in apps/demo/app/providers.tsx
NEXT_PUBLIC_SKEL_SERVE_HYBRID=true
NEXT_PUBLIC_SKEL_SERVE_PATHS=/reference,/advanced,/test
NEXT_PUBLIC_SKEL_SERVE_BLOCK_PATHS=/stress

NEXT_PUBLIC_SKEL_SHADOW_TELEMETRY=true
NEXT_PUBLIC_SKEL_SHADOW_PATHS=/reference

NEXT_PUBLIC_SKEL_STRICT_MODE=true
NEXT_PUBLIC_SKEL_STRICT_CANARY_PATHS=/reference
NEXT_PUBLIC_SKEL_STRICT_EXPANDED_PATHS=/advanced
NEXT_PUBLIC_SKEL_STRICT_BROAD_PATHS=/test
NEXT_PUBLIC_SKEL_STRICT_ROLLBACK_MODE=hybrid

NEXT_PUBLIC_SKEL_TELEMETRY_SINK=true
NEXT_PUBLIC_SKEL_USER_VISIBLE_REGRESSION_DELTA=0
NEXT_PUBLIC_SKEL_ROLLBACK_DRILL_DURATION_MS=540000`;

const rolloutCommands = `# Rollout command surface from the installed ghostframes binary
ghostframes capture
ghostframes validate
ghostframes diff
ghostframes report
ghostframes rollout`;

const capabilityCards = [
    {
        title: "Build Layer Generation",
        description: "Build commands generate fresh demo artifacts so developers can inspect skeleton behavior locally.",
    },
    {
        title: "CI Validation",
        description: "CI verifies artifacts and quality gates, and blocks stale or invalid outputs from being merged.",
    },
    {
        title: "Deploy Sanity",
        description: "Deploy runs quick checks against already-verified artifacts instead of expensive recomputation.",
    },
    {
        title: "Capture",
        description: "Snapshots route skeletons from the running app and writes manifest artifacts.",
    },
    {
        title: "Validate",
        description: "Checks required keys, coverage, and manifest safety limits before shipping.",
    },
    {
        title: "Diff & Report",
        description: "Compares candidate artifacts with baseline and generates operational reports.",
    },
    {
        title: "Rollout",
        description: "Executes policy-driven rollout decisions with telemetry and safety gates.",
    },
];

export default function CliWorkflowReferencePage() {
    return (
        <div className="space-y-6">
            <header className="space-y-3 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950 p-6 light:border-zinc-200 light:from-white light:via-zinc-50 light:to-indigo-50">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 light:text-indigo-700">Operational Pipeline</p>
                <h1 className="text-4xl font-bold text-white light:text-zinc-900">CLI Workflow</h1>
                <p className="max-w-3xl text-zinc-400 light:text-zinc-600">
                    This command-first workflow wraps components, captures artifacts, and validates rollout readiness with
                    explicit quality gates.
                </p>
            </header>

            <FeatureCard
                title="Three-Step Integration"
                description="Keep the runtime tiny and push heavy work to build-time commands"
                badge="Reference"
            >
                <ol className="space-y-3 text-sm text-zinc-300 light:text-zinc-700">
                    <li>
                        <span className="font-semibold text-white light:text-zinc-900">1. Wrap your component.</span> Use
                        AutoSkeleton in loading paths.
                    </li>
                    <li>
                        <span className="font-semibold text-white light:text-zinc-900">2. Run capture and quality checks.</span>
                        Generate and verify manifest artifacts in CI.
                    </li>
                    <li>
                        <span className="font-semibold text-white light:text-zinc-900">3. Import generated artifacts once.</span>
                        Let runtime resolution use static data first.
                    </li>
                </ol>
            </FeatureCard>

            <FeatureCard title="Capabilities" description="Current ghostframes command surface exposed by @ghostframes/runtime" badge="ghostframes">
                <div className="grid gap-3 sm:grid-cols-2">
                    {capabilityCards.map((card) => (
                        <article
                            key={card.title}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 light:border-zinc-200 light:bg-zinc-50"
                        >
                            <h2 className="mb-1 text-sm font-semibold text-white light:text-zinc-900">{card.title}</h2>
                            <p className="text-xs text-zinc-500 light:text-zinc-600">{card.description}</p>
                        </article>
                    ))}
                </div>
            </FeatureCard>

            <FeatureCard title="Layered Workflow" description="Generate in build/dev, validate in CI, sanity-check in deploy" badge="Build + CI + Deploy">
                <div className="space-y-4">
                    <CodeBlock code={buildLayerCommands} language="bash" />
                    <CodeBlock code={ciLayerCommands} language="bash" />
                    <CodeBlock code={deployLayerCommands} language="bash" />
                </div>
            </FeatureCard>

            <FeatureCard title="Workflow Commands" description="Package scripts used in this repository" badge="pnpm">
                <CodeBlock code={workflowCommands} language="bash" />
            </FeatureCard>

            <FeatureCard title="Demo App Runbook" description="Use this sequence to demonstrate the full workflow locally" badge="Demo">
                <CodeBlock code={demoRunbookCommands} language="bash" />
            </FeatureCard>

            <FeatureCard title="Runtime Rollout Template" description="Environment toggles that drive route-scoped behavior in the demo app">
                <CodeBlock code={rolloutEnvTemplate} language="bash" />
            </FeatureCard>

            <FeatureCard title="Direct CLI Invocation" description="Command entry points exposed by the installed ghostframes binary">
                <CodeBlock code={rolloutCommands} language="bash" />
            </FeatureCard>
        </div>
    );
}
