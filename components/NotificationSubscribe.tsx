"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export function NotificationSubscribe() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const subscribe = useMutation(api.pushSubscriptions.subscribe);
  const unsubscribe = useMutation(api.pushSubscriptions.unsubscribe);

  useEffect(() => {
    // Check if already subscribed
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("❌ Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      // Convert subscription to plain object
      const subscriptionJson = subscription.toJSON();

      // Save to Convex
      await subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      alert("✅ Notifications enabled!");
    } catch (error) {
      console.error("Failed to subscribe:", error);
      alert(`❌ Failed to enable notifications: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribe({ endpoint: subscription.endpoint });
      }

      setIsSubscribed(false);
      alert("✅ Notifications disabled");
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      alert(`❌ Failed to disable notifications: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null; // Push notifications not supported
  }

  return (
    <div className="flex items-center gap-2">
      {isSubscribed ? (
        <Button onClick={handleUnsubscribe} disabled={isLoading} variant="outline" size="sm">
          <BellOff className="w-4 h-4 mr-2" />
          {isLoading ? "Disabling..." : "Disable Notifications"}
        </Button>
      ) : (
        <Button onClick={handleSubscribe} disabled={isLoading} size="sm">
          <Bell className="w-4 h-4 mr-2" />
          {isLoading ? "Enabling..." : "Enable Notifications"}
        </Button>
      )}
    </div>
  );
}
