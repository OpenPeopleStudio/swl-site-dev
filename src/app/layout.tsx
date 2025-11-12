import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ConditionalFloatingChat } from "@/shared/ui/ConditionalFloatingChat";
import AmbientScene from "@/shared/ui/AmbientScene";
import { AuthWatcher } from "@/apps/core/AuthWatcher";
import { AuthStatusBanner } from "@/shared/ui/AuthStatusBanner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["300", "400", "500"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const eurostile = localFont({
  src: "../fonts/Eurostile.otf",
  variable: "--font-eurostile",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Snow White Laundry · Cortex Staff Dashboard",
  description:
    "Internal Snow White Laundry operating system for staff scheduling, menu building, inventory, and cortex reflections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showAuthBanner =
    process.env.NEXT_PUBLIC_AUTH_DEBUG === "true" ||
    process.env.NODE_ENV === "development";
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${eurostile.variable} bg-space-gradient`}
    >
      <body
        className="font-body antialiased bg-space-gradient text-white"
        data-site-mode={process.env.NEXT_PUBLIC_SITE_MODE ?? "staff"}
      >
        <AmbientScene />
        <AuthWatcher />
        {showAuthBanner && <AuthStatusBanner />}
        {children}
        <ConditionalFloatingChat />
      </body>
    </html>
  );
}
