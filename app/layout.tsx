import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SecurityScript } from "@/components/SecurityScript";
import { BackgroundManager } from "@/components/BackgroundManager";
import { SessionTimeout } from "@/components/SessionTimeout";
import { SystemStatus } from "@/components/SystemStatus";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WeatherEffect } from "@/components/WeatherEffect";
import { SeasonalEffect } from "@/components/SeasonalEffect";
import { SeasonalDecorations } from "@/components/SeasonalDecorations";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "Modern Login System",
  description: "Secure and Modern Login System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Do not access database in RootLayout during SSR. Use safe defaults.
  // Database may be unavailable; health/status endpoints and client-side
  // UI will retry and show maintenance state as needed.
  const systemTheme = 'light'
  const systemLanguage = 'th'

  return (
    <html lang={systemLanguage} className={`${kanit.variable}`} suppressHydrationWarning>
      <body className={`antialiased bg-transparent`}>
        <ThemeProvider>
          <Providers systemTheme={systemTheme} systemLanguage={systemLanguage}>
            <BackgroundManager />
            <WeatherEffect />
            <SeasonalEffect />
            <SeasonalDecorations />
            <SecurityScript />
            <SessionTimeout />
            <SystemStatus />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
