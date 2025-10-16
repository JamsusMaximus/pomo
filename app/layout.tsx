import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AmbientSoundProvider } from "@/components/AmbientSoundProvider";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Lock.in",
  description: "A minimal Pomodoro timer app",
  manifest: "/site.webmanifest",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lock.in",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
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
            <Providers>
              <ServiceWorkerRegistration />
              <PWAInstallPrompt />
              <NavbarWrapper>{children}</NavbarWrapper>
            </Providers>
          </AmbientSoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
