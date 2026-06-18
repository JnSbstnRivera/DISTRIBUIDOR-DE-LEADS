import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import AnimatedBackground from "@/components/AnimatedBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Distribuidor de Leads · Windmar Home",
  description: "Motor de distribución equitativa de leads por zona — Windmar Home PR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <ThemeProvider>
          <AnimatedBackground />
          <Nav />
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
