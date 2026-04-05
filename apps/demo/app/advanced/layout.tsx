import React from "react";

export default function AdvancedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface py-10 sm:py-12">
      <main className="app-content">{children}</main>
    </div>
  );
}