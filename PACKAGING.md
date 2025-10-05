# Package as Mac App

## Option 1: Tauri (Recommended)

### Setup

```bash
npm install -D @tauri-apps/cli
npx tauri init
```

When prompted:

- App name: `Pomo`
- Window title: `Pomo Timer`
- Web assets location: `out` (for Next.js static export)
- Dev server URL: `http://localhost:3000`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

### Configure Next.js for static export

Add to `next.config.ts`:

```typescript
const config = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

### Build & Run

```bash
npm run tauri dev      # Test in development
npm run tauri build    # Build Mac app (.dmg)
```

App will be in: `src-tauri/target/release/bundle/dmg/`

### Customize (optional)

Edit `src-tauri/tauri.conf.json`:

- Window size
- Icon (add .icns to src-tauri/icons/)
- Menu bar options
- System tray support

---

## Option 2: Electron (More Mature)

### Setup

```bash
npm install -D electron electron-builder
```

Create `electron/main.js`:

```javascript
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "../out/index.html"));
  }
}

app.whenReady().then(createWindow);
```

Add to `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "NODE_ENV=development electron .",
    "electron:build": "electron-builder"
  },
  "build": {
    "appId": "com.pomo.app",
    "mac": {
      "category": "public.app-category.productivity"
    }
  }
}
```

---

## Option 3: Quickest - Nativefier (5 minutes)

Install globally:

```bash
npm install -g nativefier
```

After deploying to Vercel:

```bash
nativefier "https://your-pomo-app.vercel.app" \
  --name "Pomo" \
  --width 600 \
  --height 800
```

Instant Mac app! But needs to be online.

---

## Option 4: PWA (No packaging needed)

Add to `app/layout.tsx` head:

```typescript
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
```

Create `public/manifest.json`:

```json
{
  "name": "Pomo Timer",
  "short_name": "Pomo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

Users can "Add to Dock" from Safari/Chrome.

---

## Recommendation

**For you:** Start with **Tauri** - it's modern, lightweight, and gives you a proper native Mac app with perfect notification support. If you need more Node.js integrations, use Electron.
