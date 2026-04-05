import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainHeader } from "../lib/demo-components";
import { ClientProviders } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghostframe Official Guide",
  description: "Zero-config skeleton loaders for React",
};

const themeInitScript = `
(() => {
  try {
    const key = "demo-theme";
    const saved = localStorage.getItem(key);
    const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const theme = saved === "light" || saved === "dark" ? saved : preferred;
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(theme);
  } catch {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="boxy-demo min-h-full flex flex-col">
        <ClientProviders>
          <MainHeader />
          <div className="app-shell w-full">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
