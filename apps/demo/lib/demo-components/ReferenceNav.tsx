"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../theme-context";
import { BrandMark } from "./BrandMark";

const navSections = [
  {
    section: "Getting Started",
    items: [{ href: "/reference", label: "Overview" }],
  },
  {
    section: "Features",
    items: [
      { href: "/reference/features", label: "All Features" },
      { href: "/reference/features/custom-slots", label: "Custom Slots" },
      { href: "/reference/features/ignore-elements", label: "Element Exclusion" },
      { href: "/reference/features/responsive", label: "Responsive Behavior" },
      { href: "/reference/features/callbacks", label: "Callbacks & Hooks" },
      { href: "/reference/features/caching", label: "Blueprint Caching" },
      { href: "/reference/features/fallback", label: "Fallback Prop" },
      { href: "/reference/features/resolver-policy", label: "Resolver Policy" },
      { href: "/reference/features/rollout-telemetry", label: "Rollout Telemetry" },
      { href: "/reference/features/manifest-parse-validation", label: "Manifest Parse & Validation" },
      { href: "/reference/features/no-skeleton-vs-ignore", label: "No Skeleton vs Ignore" },
    ],
  },
  {
    section: "Server Rendering",
    items: [{ href: "/reference/ssr", label: "SSR & Static Blueprints" }],
  },
  {
    section: "Configuration",
    items: [
      { href: "/reference/configuration", label: "All Config Options" },
      { href: "/config-playground", label: "Config Playground" },
    ],
  },
  {
    section: "Operations",
    items: [{ href: "/reference/cli-workflow", label: "CLI Workflow" }],
  },
  {
    section: "Advanced",
    items: [
      { href: "/advanced", label: "Advanced Patterns" },
      { href: "/advanced/form-loading", label: "Forms & Loading" },
    ],
  },
];

export function ReferenceNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-72 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 light:border-zinc-200 light:bg-zinc-50 md:flex">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 text-white transition-opacity hover:opacity-80 light:text-zinc-900">
          <BrandMark size={20} />
          <span className="text-sm font-bold">Ghostframe</span>
        </Link>

        <button
          onClick={toggleTheme}
          suppressHydrationWarning
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:bg-white light:text-zinc-700 light:hover:border-zinc-400"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      {navSections.map((section) => (
        <div key={section.section} className="mb-6">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-400">
            {section.section}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${active
                      ? "bg-indigo-500/20 text-indigo-300 light:bg-indigo-50 light:text-indigo-700"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-700"
                      }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
