import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — zero layout shift, automatic preload, no
// runtime request to fonts.googleapis.com. Exposed as a CSS variable so
// globals.css and tailwind.config.ts can both reference it.
const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IRYS Uptime Dashboard",
    template: "%s · IRYS",
  },
  description: "CAS · Fire · Lube · GPS fleet uptime monitoring",
  openGraph: {
    title: "IRYS Uptime Dashboard",
    description: "CAS · Fire · Lube · GPS fleet uptime monitoring",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "IRYS Uptime Dashboard",
    description: "CAS · Fire · Lube · GPS fleet uptime monitoring",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1428",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body>{children}</body>
    </html>
  );
}
