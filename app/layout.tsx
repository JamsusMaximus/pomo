import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
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
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
