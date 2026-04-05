import React from "react";
import { ReferenceNav } from "../../lib/demo-components";

export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-57px)] bg-zinc-950 light:bg-white">
      <ReferenceNav />

      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
        <div className="app-surface app-content py-10 sm:py-12">{children}</div>
      </main>
    </div>
  );
}
