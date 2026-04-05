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

const rolloutCommands = `# Rollout command surface from @ghostframe/cli
node packages/cli/dist/index.js capture
node packages/cli/dist/index.js validate
node packages/cli/dist/index.js diff
node packages/cli/dist/index.js report
node packages/cli/dist/index.js rollout`;

const capabilityCards = [
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

            <FeatureCard title="Capabilities" description="Current @ghostframe/cli command surface" badge="@ghostframe/cli">
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

            <FeatureCard title="Workflow Commands" description="Package scripts used in this repository" badge="pnpm">
                <CodeBlock code={workflowCommands} language="bash" />
            </FeatureCard>

            <FeatureCard title="Direct CLI Invocation" description="Command entry points implemented in packages/cli/src/index.ts">
                <CodeBlock code={rolloutCommands} language="bash" />
            </FeatureCard>
        </div>
    );
}
