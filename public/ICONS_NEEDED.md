# PWA Icons Needed

The PWA manifest references the following icons that need to be created:

## Required Icons

1. **icon-192.png** (192x192 pixels)
   - Used for: Android home screen, notification icon
   - Should be: App logo with transparent or colored background
   - Format: PNG with transparency support

2. **icon-512.png** (512x512 pixels)
   - Used for: Android splash screen, app drawer
   - Should be: Same design as 192px version, higher resolution
   - Format: PNG with transparency support

## How to Create Icons

### Option 1: Use a Design Tool

1. Design your app icon (512x512)
2. Export at 512x512 (icon-512.png)
3. Resize to 192x192 (icon-192.png)
4. Save both to `public/` directory

### Option 2: Use Online Generator

1. Go to https://realfavicongenerator.net/
2. Upload your logo
3. Download the generated icons
4. Rename and place in `public/`

### Option 3: Simple Placeholder (Temporary)

For now, you can create simple colored squares with the app name:

1. Use any image editor
2. Create 512x512 orange square (#f97316)
3. Add white text "Lock.in" or "L"
4. Export as icon-512.png
5. Resize to 192x192 for icon-192.png

## Design Recommendations

- **Color Scheme:** Use your app's primary color (orange #f97316)
- **Style:** Modern, minimalist, flat design
- **Content:** Either:
  - Full app name "Lock.in"
  - Abbreviated "L"
  - Timer/clock symbol
  - Flame emoji (matches your streak branding)
- **Background:** Solid color or subtle gradient
- **Padding:** Leave 10-15% padding around edges for "maskable" icons

## Testing

Once icons are added:

1. Clear browser cache
2. Uninstall PWA if already installed
3. Reinstall and check if icons appear correctly
4. Check on both mobile and desktop

## Current Fallback

The app will still work without icons, but:

- Default browser icon will be used
- Won't look professional when installed
- May affect user trust and engagement

**Priority:** Medium - The PWA works without icons, but they significantly improve the user experience.
