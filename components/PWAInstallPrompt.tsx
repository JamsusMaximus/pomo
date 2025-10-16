"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "@/components/motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the app as a PWA
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if user has dismissed before (in this session)
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setDismissed(true);
    }

    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show prompt after a delay so it doesn't interrupt the user immediately
      setTimeout(() => {
        if (!dismissed && !isStandaloneMode) {
          setShowPrompt(true);
        }
      }, 3000); // Show after 3 seconds
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS, show manual instructions if not installed
    if (iOS && !isStandaloneMode && !dismissed) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds on iOS
    }

    // For localhost/development on non-iOS: Show manual instructions
    // beforeinstallprompt often doesn't fire on localhost
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.");

    if (!iOS && !isStandaloneMode && !dismissed && isLocalhost) {
      // Wait a bit to see if beforeinstallprompt fires
      const timer = setTimeout(() => {
        // If no deferred prompt after 10 seconds, show manual instructions
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 10000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [dismissed, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed or dismissed
  if (isStandalone || !showPrompt || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 backdrop-blur-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                {isIOS ? (
                  <Smartphone className="w-5 h-5 text-white" />
                ) : (
                  <Download className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Install Lock.in App</h3>

                {isIOS ? (
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>Install this app to receive notifications and stay on track.</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                      <li>
                        Tap the Share button{" "}
                        <span className="inline-block">
                          <svg className="w-3 h-3 inline" viewBox="0 0 50 50">
                            <path
                              fill="currentColor"
                              d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
                            />
                            <path fill="currentColor" d="M24 7h2v21h-2z" />
                            <path
                              fill="currentColor"
                              d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
                            />
                          </svg>
                        </span>
                      </li>
                      <li>Select &quot;Add to Home Screen&quot;</li>
                      <li>Tap &quot;Add&quot; to install</li>
                    </ol>
                  </div>
                ) : deferredPrompt ? (
                  <p className="text-xs text-muted-foreground">
                    Install this app to receive notifications and stay on track.
                  </p>
                ) : (
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>Install this app to receive notifications and stay on track.</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                      <li>Click the browser menu (⋮ or ⋯)</li>
                      <li>Look for &quot;Install app&quot; or &quot;Add to Home screen&quot;</li>
                      <li>Click to install</li>
                    </ol>
                    <p className="text-xs italic mt-2">
                      Note: On Chrome, you can also click the install icon (⊕) in the address bar.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-muted rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isIOS && (
              <div className="mt-3 flex gap-2">
                {deferredPrompt ? (
                  <>
                    <Button onClick={handleInstallClick} className="flex-1" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Install
                    </Button>
                    <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                      Maybe Later
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        // Try to trigger browser's install UI
                        // This won't work on localhost, but worth trying
                        alert(
                          "To install:\n\n" +
                            "1. Click the menu icon (⋮ or ⋯) in your browser\n" +
                            "2. Look for 'Install app' or 'Add to Home screen'\n" +
                            "3. Click to install\n\n" +
                            "Or look for the install icon (⊕) in the address bar."
                        );
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      How to Install
                    </Button>
                    <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            )}

            {isIOS && (
              <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full mt-3">
                Got it
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
