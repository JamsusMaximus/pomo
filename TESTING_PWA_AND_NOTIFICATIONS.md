# Testing PWA and Push Notifications on Localhost

This guide explains how to test the PWA installation and push notifications on your local development environment.

## Prerequisites

✅ You have already set up:

- VAPID keys in `.env.local`
- ADMIN_EMAILS environment variable in Convex
- Dev server running (`npm run dev`)

## Option 1: Test on Localhost with Chrome DevTools (Recommended)

### Step 1: Install the PWA on Localhost

1. **Open Chrome DevTools** (F12 or Right-click → Inspect)
2. Go to the **Application** tab
3. In the left sidebar, click **Manifest**
4. You should see your PWA manifest with:
   - Name: "Lock.in"
   - Theme color: #f97316
   - Icons: icon-192.png, icon-512.png

5. **Install the PWA**:
   - **Method A**: Click the install icon (⊕) in the Chrome address bar
   - **Method B**: Chrome menu (⋮) → "Install Lock.in..."
   - **Method C**: In DevTools Application tab → Manifest → Click "Add to home screen"

6. After installing, the app will open in its own window (standalone mode)

### Step 2: Enable Notifications

1. In the installed PWA, you should see a notification permission prompt
2. Click **Allow** when prompted
3. The app will subscribe to push notifications automatically

**Verify subscription:**

- Go to `/admin` in the PWA
- Check the "Push Notifications" section
- You should see "1" under Subscriptions

### Step 3: Test Sending Notifications

1. In the admin panel, scroll to "Push Notifications"
2. Click **"Send Now"** button
3. Fill in the form:
   - Title: "Test Notification"
   - Body: "This is a test from localhost!"
4. Click **"Send to 1 Device(s)"**
5. Confirm in the dialog

**Expected result:**

- You should see a success message showing "Sent: 1"
- A push notification should appear on your system (top-right on Windows/Linux, top-right on macOS)
- You can click the notification to open the app

### Troubleshooting on Localhost

**Issue: Install icon doesn't appear in address bar**

- Solution: The install prompt banner should appear after 10 seconds. Click "How to Install" button for instructions.

**Issue: Notification permission not requested**

- Solution: Check browser settings → Site Settings → Notifications → Ensure notifications are not blocked for localhost

**Issue: Notification doesn't appear**

- Check DevTools Console for errors
- Verify service worker is active: DevTools → Application → Service Workers
- Check notification permission: DevTools → Application → Storage → Notifications

## Option 2: Test on Your Local Network (Mobile Testing)

This allows you to test on your phone while still using localhost.

### Step 1: Find Your Local IP

Your dev server already shows your network IP:

```
Network: http://192.168.1.219:3000
```

### Step 2: Access from Mobile Device

1. Connect your phone to the **same Wi-Fi network** as your computer
2. Open Chrome/Safari on your phone
3. Go to `http://192.168.1.219:3000` (use your actual IP)

### Step 3: Install PWA on Mobile

**On Android (Chrome):**

1. After 10 seconds, the install prompt should appear
2. Tap "Install"
3. Follow the prompts

**On iOS (Safari):**

1. Tap the Share button (square with arrow)
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add"

### Step 4: Test Notifications

1. Open the installed app from your home screen
2. Grant notification permissions when prompted
3. On your computer, go to `/admin` in your browser
4. Send a notification
5. The notification should appear on your phone!

## Option 3: Test on Production/Deployed Site

For the most realistic testing:

1. Deploy your app to a production URL (Vercel, Netlify, etc.)
2. PWA features work best on HTTPS (required for service workers)
3. Visit the deployed URL
4. Install the PWA
5. Test notifications

## Testing Checklist

- [ ] PWA installs successfully
- [ ] App icon appears on home screen/apps list
- [ ] Notification permission is requested
- [ ] User can grant notification permission
- [ ] Subscription is saved to database (visible in admin panel)
- [ ] Admin can send notification successfully
- [ ] Notification appears on device
- [ ] Clicking notification opens the app
- [ ] Notification includes custom title and body
- [ ] Multiple devices can receive notifications

## Common Issues and Solutions

### "beforeinstallprompt event not firing"

**Cause**: Chrome doesn't fire this event on localhost in some cases
**Solution**: Use the manual install instructions that appear after 10 seconds, or install via Chrome menu

### "Service worker registration failed"

**Cause**: Service workers require HTTPS (except on localhost)
**Solution**: Make sure you're using localhost (not 127.0.0.1) or deploy to HTTPS

### "Push notification failed with 410"

**Cause**: Subscription expired or was unsubscribed
**Solution**: The system automatically deletes expired subscriptions. User needs to reinstall the PWA or refresh the page.

### "No notification appears"

**Cause**: System notifications are disabled
**Solution**:

- **Windows**: Settings → System → Notifications → Enable notifications
- **macOS**: System Preferences → Notifications → Chrome → Enable
- **Android**: Settings → Apps → Chrome → Notifications → Enable

## Development Tips

1. **Clear the cache** if you make changes to the service worker:
   - DevTools → Application → Service Workers → Unregister
   - DevTools → Application → Clear storage → Clear site data

2. **Test in incognito mode** for a fresh user experience

3. **Use DevTools Application tab** to debug:
   - View manifest
   - Check service worker status
   - Inspect storage (subscriptions)
   - Simulate offline mode

4. **Test notification appearance** by sending different content:
   - Short vs long titles
   - Different body text lengths
   - With and without actions (future feature)

## Next Steps

Once PWA and notifications are working:

1. Add automated notification rules (inactivity reminders, streak alerts, etc.)
2. Implement notification actions (buttons in notifications)
3. Add notification preferences in user settings
4. Track notification engagement metrics

## Useful DevTools Commands

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations();

// Check notification permission
Notification.permission;

// Request notification permission
Notification.requestPermission();

// Check if running as PWA
window.matchMedia("(display-mode: standalone)").matches;

// Get push subscription
navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription());
```
