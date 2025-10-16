import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import webpush from "web-push";

// Configure VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails("mailto:jddmcaulay@gmail.com", vapidPublicKey, vapidPrivateKey);

// Helper to get admin emails from environment
function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (!adminEmailsEnv) return [];
  return adminEmailsEnv.split(",").map((email) => email.trim());
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access via Clerk
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's email to verify admin access
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(userEmail || "")) {
      return NextResponse.json({ error: "Unauthorized: Admin access only" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { title, body: notificationBody } = body;

    if (!title || !notificationBody) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    // Get Clerk JWT token for Convex
    const token = await getToken({ template: "convex" });

    // Get all subscriptions from Convex with auth
    const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convexClient.setAuth(token!);

    const subscriptions = await convexClient.query(api.pushSubscriptions.getAllSubscriptions);

    console.log(`[Admin Send Notification] Found ${subscriptions.length} subscriptions`);
    subscriptions.forEach((sub, i) => {
      console.log(`[Admin Send Notification] Subscription ${i + 1}:`, {
        endpoint: sub.endpoint.substring(0, 50) + "...",
        userId: sub.userId,
      });
    });

    const results = {
      total: subscriptions.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        url: "/",
      },
    });

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        console.log(`[Admin Send Notification] Sending to ${sub.endpoint.substring(0, 50)}...`);

        const result = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload
        );

        console.log(`[Admin Send Notification] ✓ Sent successfully`, result);
        results.sent++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Admin Send Notification] ✗ Failed to send:`, errorMessage);
        results.failed++;
        results.errors.push(`User ${sub.userId}: ${errorMessage}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Admin Send Notification] Error:", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
