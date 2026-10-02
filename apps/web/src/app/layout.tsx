import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// The display name comes from the API at runtime (Settings → AVA name).
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_AVA_NAME ?? "AVA",
  description: "Internal office assistant",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
