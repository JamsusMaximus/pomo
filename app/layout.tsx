import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AmbientSoundProvider } from "@/components/AmbientSoundProvider";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Pomodoro Timer",
  description: "A minimal Pomodoro timer app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="light" storageKey="pomo-theme">
          <AmbientSoundProvider>
            <Providers>{children}</Providers>
          </AmbientSoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
