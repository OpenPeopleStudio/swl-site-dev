import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import FloatingChat from "@/shared/ui/FloatingChat";
import AmbientScene from "@/shared/ui/AmbientScene";

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
        {children}
        <FloatingChat />
      </body>
    </html>
  );
}
