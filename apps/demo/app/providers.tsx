"use client";

import React from "react";
import { SkelcoreProvider } from "@skelcore/react";
import { ThemeProvider } from "../lib/theme-context";

export function ClientProviders({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <ThemeProvider>
            <SkelcoreProvider>
                {children}
            </SkelcoreProvider>
        </ThemeProvider>
    );
}
