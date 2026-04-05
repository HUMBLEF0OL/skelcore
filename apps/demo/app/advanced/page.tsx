import Link from "next/link";

const patterns = [
  {
    href: "/advanced/form-loading",
    title: "Form Loading",
    description: "Keep forms interactive while dependent content skeletonizes.",
    status: "Available",
  },
  {
    href: "/reference/features/callbacks",
    title: "Measurement Hooks",
    description: "Inspect blueprints and wire measurement lifecycle callbacks.",
    status: "Available",
  },
  {
    href: "/reference/features/caching",
    title: "Caching Strategy",
    description: "Understand cache reuse behavior for repeated structures.",
    status: "Available",
  },
];

export default function AdvancedPage() {
  return (
    <div className="guide-flow">
      <header className="guide-header">
        <h1 className="guide-title font-bold text-white light:text-zinc-900">Advanced Patterns</h1>
        <p className="text-zinc-500 light:text-zinc-600">
          Practical integration patterns for production-grade loading flows.
        </p>
      </header>

      <div className="grid gap-4">
        {patterns.map((pattern) => (
          <Link
            key={pattern.title}
            href={pattern.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-indigo-500/50 light:border-zinc-200 light:bg-zinc-100 light:hover:border-indigo-300"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white light:text-zinc-900">{pattern.title}</h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300 light:border-emerald-300 light:bg-emerald-50 light:text-emerald-700">
                {pattern.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 light:text-zinc-600">{pattern.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}