# Distributing the Mac App

## After Building

Once `npm run tauri:build` completes, you'll find:

```
src-tauri/target/release/bundle/dmg/Pomo_0.1.0_aarch64.dmg  (Apple Silicon)
src-tauri/target/release/bundle/dmg/Pomo_0.1.0_x64.dmg      (Intel - if you build on Intel Mac)
```

## Option 1: GitHub Releases (Recommended)

**Best for**: Free hosting, automatic updates, versioning

```bash
# 1. Create a new release on GitHub
gh release create v0.1.0 \
  --title "Pomo v0.1.0" \
  --notes "First release of Pomo Timer for Mac" \
  src-tauri/target/release/bundle/dmg/*.dmg

# 2. Users download from: https://github.com/yourusername/pomo/releases/latest
```

**Add to your website:**

```html
<a href="https://github.com/yourusername/pomo/releases/latest">
  Download for Mac (Apple Silicon)
</a>
```

---

## Option 2: Vercel Static Hosting

**Best for**: Quick distribution without GitHub

```bash
# 1. Copy .dmg to public folder
cp src-tauri/target/release/bundle/dmg/Pomo_0.1.0_aarch64.dmg public/downloads/

# 2. Deploy to Vercel (auto-deployed on git push)
git add public/downloads/
git commit -m "Add Mac app download"
git push
```

**Warning:** Large files (>100MB) may slow down deployments. Use GitHub Releases instead.

---

## Option 3: Self-Hosted / Dropbox / Google Drive

```bash
# Upload .dmg to any file host
# Share direct download link
```

---

## Code Signing (Optional but Recommended)

**Without signing:** Users will see "Pomo is from an unidentified developer"

**Workaround for users:**

- Right-click → Open (instead of double-click)
- Or: System Settings → Privacy & Security → Open Anyway

**To properly sign (requires Apple Developer Account - $99/year):**

```bash
# 1. Get your Developer ID certificate from Apple
# 2. Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name" \
  src-tauri/target/release/bundle/macos/Pomo.app

# 3. Notarize with Apple (automated with tauri-action in CI)
xcrun notarytool submit Pomo.dmg \
  --apple-id your@email.com \
  --team-id TEAMID \
  --password app-specific-password \
  --wait
```

**Or use GitHub Actions** to auto-sign on every release:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "Pomo ${{ github.ref_name }}"
          releaseBody: "See CHANGELOG.md for details"
          releaseDraft: false
```

---

## Adding a Download Button to Your Website

Create `app/download/page.tsx`:

```typescript
export default function DownloadPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Download Pomo</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Get the native Mac app for the best experience
        </p>

        <div className="space-y-4">
          <a
            href="https://github.com/yourusername/pomo/releases/latest/download/Pomo_0.1.0_aarch64.dmg"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
          >
            Download for Mac (Apple Silicon)
          </a>

          <p className="text-sm text-muted-foreground">
            macOS 10.13+ • 5MB • Free & Open Source
          </p>
        </div>

        <div className="mt-12 text-left">
          <h2 className="text-2xl font-bold mb-4">Why use the Mac app?</h2>
          <ul className="space-y-2">
            <li>✅ Native notifications that work even when the app is in the background</li>
            <li>✅ Faster performance (no browser overhead)</li>
            <li>✅ Lives in your dock like a native app</li>
            <li>✅ Works offline</li>
            <li>✅ Only 5MB (vs 100MB+ for Electron apps)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
```

---

## Version Updates

When you release a new version:

```bash
# 1. Update version in src-tauri/tauri.conf.json
{
  "version": "0.2.0"
}

# 2. Rebuild
npm run tauri:build

# 3. Create new release
gh release create v0.2.0 src-tauri/target/release/bundle/dmg/*.dmg
```

---

## Automatic Updates (Advanced)

Tauri supports auto-updates. See: https://tauri.app/v1/guides/distribution/updater

Your app will automatically check for updates and prompt users to install them.
