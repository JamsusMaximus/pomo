"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { useUser } from "@clerk/nextjs";

/**
 * Push Notification Settings Component
 * Allows users to subscribe/unsubscribe from push notifications
 */
export function PushNotificationSettings() {
  const { isSignedIn } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useMutation(api.pushSubscriptions.subscribe);
  const unsubscribe = useMutation(api.pushSubscriptions.unsubscribe);
  const mySubscriptions = useQuery(
    api.pushSubscriptions.getMySubscriptions,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    // Check if push notifications are supported
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Check if we have an active subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, [mySubscriptions]);

  const handleSubscribe = async () => {
    if (!isSupported || !isSignedIn) return;

    setIsLoading(true);
    try {
      // Request permission if needed
      if (permission !== "granted") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          alert(
            "Notification permission denied. Please enable notifications in your browser settings."
          );
          setIsLoading(false);
          return;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("[Push] VAPID public key not found");
        alert("Push notifications are not configured. Please contact the administrator.");
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      console.log("[Push] Subscribed successfully");
    } catch (error) {
      console.error("[Push] Subscription failed:", error);
      alert("Failed to subscribe to push notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push service
        await subscription.unsubscribe();

        // Remove from server
        await unsubscribe({
          endpoint: subscription.endpoint,
        });

        setIsSubscribed(false);
        console.log("[Push] Unsubscribed successfully");
      }
    } catch (error) {
      console.error("[Push] Unsubscribe failed:", error);
      alert("Failed to unsubscribe from push notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return null;
  }

  if (!isSupported) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-orange-500" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <h3 className="font-semibold">Push Notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSubscribed
              ? "You'll receive notifications for important updates and reminders."
              : "Get notified when your timer completes and stay on track with your goals."}
          </p>
          {isSubscribed && mySubscriptions && mySubscriptions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Active on {mySubscriptions.length} device
              {mySubscriptions.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
        >
          {isLoading ? (
            "..."
          ) : isSubscribed ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Subscribed
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </>
          )}
        </Button>
      </div>

      {permission === "denied" && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}
    </div>
  );
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
