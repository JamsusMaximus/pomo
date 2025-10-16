# PWA & Push Notifications Setup

This document explains the PWA (Progressive Web App) and push notification system for Lock.in.

## Overview

The app is now a full PWA with:

- **Installable** on mobile and desktop devices
- **Offline support** with service worker caching
- **Push notifications** that work even when the app is closed
- **Auto-updates** to ensure users always have the latest version

## VAPID Keys

VAPID keys are already generated and stored in `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAdQz8vz1y1uv_5l8tzkfA7Mn_jW16xQ3U93-JiDYZTmmbW6jcvPH2wHpcA1M5CxyuyLf9hkUnVB8hDnR-rp5rk
VAPID_PRIVATE_KEY=L_tATXV1Z0qgS5WDtC3XKZDjraW3h8aprpp17N1p4OE
```

**⚠️ IMPORTANT:** Never commit these keys to git. They should only exist in `.env.local` (local) and your production environment variables.

## How Updates Work

### Automatic Version Updates

1. **Service Worker Versioning:**
   - The service worker has a `VERSION` constant (`public/sw.js`)
   - When you deploy changes, increment this version
   - Users will automatically get the update within 1 hour or on next visit

2. **Update Script:**

   ```bash
   ./scripts/update-sw-version.sh
   ```

   This automatically increments the patch version (v1.0.0 → v1.0.1)

3. **Manual Version Update:**
   Edit `public/sw.js`:
   ```javascript
   const VERSION = "v1.0.1"; // Increment this
   ```

### How Users Get Updates

1. **Automatic Check:** Service worker checks for updates every hour
2. **On Visit:** Updates are checked whenever user opens the app
3. **Silent Update:** New version downloads in background
4. **Auto-Activation:** After 3 seconds, new version activates
5. **Page Reload:** Page automatically reloads with new version

## Browser Support

### Full Support (Desktop + Mobile)

- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (Desktop)
- ✅ Opera

### Limited Support

- ⚠️ iOS Safari: Only works if app is installed to home screen
- ⚠️ Chrome iOS: Same as Safari (uses WebKit engine)

## User Flow

### Installing the PWA

**Desktop:**

1. Visit the app in Chrome/Edge
2. Click install icon in address bar
3. App opens in standalone window

**Android:**

1. Visit the app in Chrome
2. Tap "Add to Home Screen" in menu
3. App icon appears on home screen

**iOS:**

1. Visit the app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. App icon appears on home screen

### Enabling Push Notifications

1. Go to Profile page
2. Find "Push Notifications" section
3. Click "Enable Notifications"
4. Browser shows permission prompt
5. Accept to receive notifications

## Admin: Managing Notifications

### Viewing Stats

Admin panel (`/admin`) shows:

- Total subscriptions
- Active users
- Total notifications sent
- Delivery rate

### Creating Notification Rules

Currently the infrastructure is in place, but rule creation UI needs to be completed. Rules support:

**Triggers:**

- `inactivity` - User hasn't completed pomo in X hours
- `streak_risk` - Streak about to expire
- `challenge_available` - New challenge unlocked
- `friend_activity` - Friend completed pomo
- `daily_goal` - Daily goal reminder
- `manual` - Manually triggered

**Targeting:**

- `all` - All users
- `active` - Active in last 7 days
- `inactive` - Inactive for 7+ days
- `streak_holders` - Users with active streaks

**Schedule:**

- `immediate` - Send right away
- `daily` - Once per day at specific time
- `interval` - Every X hours

## Development Workflow

### Before Each Deployment

1. **Update Service Worker Version:**

   ```bash
   ./scripts/update-sw-version.sh
   ```

2. **Test Locally:**
   - Open app in browser
   - Check console for service worker logs
   - Verify notifications work (see Testing section)

3. **Deploy:**
   - Push to production
   - Users will get update automatically

### Testing Push Notifications

1. **Subscribe to notifications:**
   - Go to Profile page
   - Enable notifications
   - Accept browser permission

2. **Test from browser console:**

   ```javascript
   // Get your subscription
   navigator.serviceWorker.ready.then((reg) => {
     reg.pushManager.getSubscription().then((sub) => {
       console.log(JSON.stringify(sub));
     });
   });
   ```

3. **Send test notification** (you'll need to implement this):
   - Create a Convex action that sends push notifications
   - Use `web-push` npm package
   - Send to specific subscription endpoint

## Files Structure

```
pomo/
├── public/
│   ├── sw.js                    # Service worker (handles push notifications)
│   └── manifest.json            # PWA manifest (app metadata)
├── components/
│   ├── ServiceWorkerRegistration.tsx  # Registers SW & handles updates
│   └── PushNotificationSettings.tsx   # User subscription UI
├── convex/
│   ├── pushSubscriptions.ts     # Subscription CRUD operations
│   ├── notificationRules.ts     # Notification rules CRUD
│   └── schema.ts                # Database schema
├── app/
│   ├── layout.tsx               # Includes SW registration
│   ├── profile/page.tsx         # Shows notification settings
│   └── admin/page.tsx           # Admin notification management
└── scripts/
    └── update-sw-version.sh     # Auto-increment SW version
```

## Next Steps

### To Start Sending Notifications:

1. **Create notification sending logic:**

   ```typescript
   // convex/pushNotifications.ts (needs to be created)
   import { action } from "./_generated/server";
   import webpush from "web-push";

   export const sendPushNotification = action({
     args: { ... },
     handler: async (ctx, args) => {
       // Get subscriptions
       // Send notifications using web-push
       // Log results
     }
   });
   ```

2. **Set up VAPID in production:**
   - Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to Vercel env vars
   - Add `VAPID_PRIVATE_KEY` to Vercel env vars (keep secret!)

3. **Create notification rules UI:**
   - Add form in admin panel
   - Connect to `createRule` mutation
   - Allow editing/deleting rules

4. **Set up cron jobs:**
   - Use Convex cron jobs for scheduled notifications
   - Trigger rules based on user activity

## Troubleshooting

### Service Worker Not Updating

1. Check browser console for errors
2. Manually unregister: Chrome DevTools → Application → Service Workers → Unregister
3. Clear cache and hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Notifications Not Appearing

1. Check browser permissions: Settings → Site Settings → Notifications
2. Verify subscription in Convex database
3. Check service worker console logs
4. Ensure VAPID keys are correct

### PWA Not Installing

1. Must be served over HTTPS (or localhost)
2. Must have valid manifest.json
3. Must have registered service worker
4. Some browsers require user interaction

## Security Notes

- **VAPID Keys:** Keep private key secret, never commit to git
- **Subscriptions:** Store securely in Convex, never expose endpoints publicly
- **Permissions:** Users must explicitly grant notification permission
- **Content:** Never include sensitive data in notification content

## Resources

- [Web Push API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [web-push library](https://github.com/web-push-libs/web-push)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
