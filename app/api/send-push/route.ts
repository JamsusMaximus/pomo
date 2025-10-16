import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(request: NextRequest) {
  try {
    // Configure VAPID details at runtime
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    webpush.setVapidDetails("mailto:jddmcaulay@gmail.com", vapidPublicKey, vapidPrivateKey);

    // Verify request has auth token
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PUSH_API_SECRET || "dev-secret-token";

    console.log("[Push API] Auth header:", authHeader ? "present" : "missing");
    console.log("[Push API] Expected token:", expectedToken?.substring(0, 20) + "...");

    if (authHeader !== `Bearer ${expectedToken}`) {
      console.error("[Push API] Auth failed - Header:", authHeader?.substring(0, 30));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, payload } = body;

    if (!subscription || !payload) {
      return NextResponse.json({ error: "Missing subscription or payload" }, { status: 400 });
    }

    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify(payload));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Push API] Error:", errorMessage);

    // Return specific error codes
    if (errorMessage.includes("410")) {
      return NextResponse.json({ error: "Subscription expired", code: 410 }, { status: 410 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
