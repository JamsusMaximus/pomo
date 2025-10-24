import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AmbientSoundProvider } from "@/components/AmbientSoundProvider";
import { NavbarWrapper } from "@/components/NavbarWrapper";
// import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
// import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Lock.in",
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
            <Providers>
              {/* <ServiceWorkerRegistration /> */}
              {/* <PWAInstallPrompt /> */}
              <NavbarWrapper>{children}</NavbarWrapper>
            </Providers>
          </AmbientSoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
