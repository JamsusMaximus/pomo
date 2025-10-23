# 🍅 Pomo

A modern, full-featured Pomodoro timer web application built with Next.js, featuring user authentication, gamification, progress tracking, and AI-powered changelog generation.

## ✨ Features

### Core Functionality

- **Pomodoro Timer** - Classic 25-minute focus sessions with customizable work/break intervals
- **Session Management** - Track all your completed pomodoro sessions with detailed history
- **Offline Support** - Works offline with automatic sync when connection is restored
- **Sound Notifications** - Audio alerts when sessions complete (customizable)

### Gamification & Progress

- **Leveling System** - Earn XP and level up as you complete pomodoros
- **Challenges & Badges** - Unlock achievements for streaks, totals, and milestones
- **Visual Focus Graph** - Weekly heatmap showing your productivity patterns
- **Statistics Dashboard** - Track weekly, monthly, yearly, and all-time stats

### User Experience

- **User Authentication** - Secure auth via Clerk with profile management
- **Dark Mode** - Beautiful dark theme optimized for focus
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Sync** - All data synced across devices via Convex

### Admin Features

- **Challenge Management** - Create and manage custom challenges
- **Level Configuration** - Configure level thresholds and titles
- **Badge System** - Icon-based badges using Lucide icons

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and React 19
- **Backend**: [Convex](https://www.convex.dev/) - Real-time database with serverless functions
- **Authentication**: [Clerk](https://clerk.com/) - User management and auth
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with shadcn/ui components
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
- **AI**: [Anthropic Claude](https://www.anthropic.com/) (Haiku) for changelog generation

## 📦 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Convex account ([dashboard.convex.dev](https://dashboard.convex.dev))
- Clerk account ([clerk.com](https://clerk.com))
- Anthropic API key (optional, for changelog generation)

### Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/yourusername/pomo.git
   cd pomo
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Clerk and Convex credentials
   ```

3. **Verify setup**

   ```bash
   npm run verify-setup
   ```

4. **Start development servers** (automatically starts Next.js + Convex)

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

5. **Install git hooks** (recommended)

   ```bash
   bash scripts/install-hooks.sh
   ```

   This installs:
   - **Pre-commit hook**: Auto-formats code, fixes ESLint errors, checks docs
   - **Pre-push hook**: Runs `npm run build` before push (catches build errors before Vercel)

📖 **Detailed setup guide:** See [Development Setup](./docs/setup/development.md) for troubleshooting, VS Code setup, and more.

## 🎯 How It Works

### Session Flow

1. User starts a pomodoro timer (25 minutes by default)
2. Session runs locally in browser with countdown
3. User can pause, resume, or skip the session
4. On completion, session is saved to Convex database
5. XP is awarded, level progress updated, challenges checked
6. If offline, sessions are stored locally and synced when online

### Data Architecture

**Convex Collections:**

- `users` - User profiles with level, XP, and streak data
- `sessions` - All completed pomodoro sessions
- `challenges` - Challenge definitions (admin-managed)
- `userChallenges` - User progress on each challenge
- `levelConfig` - Level thresholds and titles

### Gamification System

**Leveling:**

- Each pomodoro = 100 XP
- Levels have configurable thresholds (default: 1, 5, 10, 25, 50, 100, 250 pomodoros)
- Visual progress bar shows next level

**Challenges:**

- **Total** - Complete X pomodoros all-time
- **Streak** - Maintain X days in a row
- **Daily/Weekly/Monthly** - Complete X in time period
- **Recurring Monthly** - Complete X in specific month

**Badges:**

- Unlocked via challenges
- Visual icons using Lucide library
- Displayed on profile page

### Offline-First Design

Sessions are stored in `localStorage` and synced on:

- Page load (if user is authenticated)
- Manual retry button
- Automatic retry with exponential backoff (2s, 4s, 8s)

Error boundaries catch sync failures and show user-friendly messages.

## 🤖 AI Changelog Generation

The project includes a changelog generation system using Claude Haiku.

### Manual Generation

```bash
# Requires ANTHROPIC_API_KEY environment variable
npm run generate:changelog
```

**Output:** `lib/changelog-data.ts`

### Features

- Analyzes all commits since last changelog entry
- Categorizes changes as "New", "Improved", or "Fixed"
- Filters out backend/infrastructure changes
- Groups similar changes together
- Max 5 changes per day for clarity
- Handles multi-day gaps in commit history

## 📁 Project Structure

```
pomo/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home - Pomodoro timer
│   ├── profile/page.tsx   # User profile & stats
│   └── admin/page.tsx     # Admin panel
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── Timer.tsx         # Pomodoro timer logic
│   ├── FocusGraph.tsx    # Weekly heatmap
│   └── ErrorBoundary.tsx # Error handling
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── sessions.ts       # Session queries/mutations
│   ├── users.ts          # User management
│   ├── challenges.ts     # Challenge system
│   └── levels.ts         # Leveling system
├── lib/                  # Utilities
│   ├── changelog-data.ts # Generated changelog
│   └── utils.ts          # Helper functions
└── scripts/              # Build scripts
    ├── generate-changelog.mjs  # AI changelog generator
    └── install-hooks.sh        # Git hook installer
    └── doc-check-pre-commit.sh # Documentation validation
```

## 🚀 Deployment

See [Production Setup](./docs/setup/production.md) for complete deployment guide.

**Quick deploy:**

```bash
# Deploy Convex backend
npx convex deploy

# Deploy to Vercel
vercel --prod
```

**Environment Variables:** See [Production Setup](./docs/setup/production.md#step-3-configure-vercel)

## 🧪 Development

### Available Scripts

```bash
npm run dev             # Start Next.js + Convex dev servers (with auto env validation)
npm run dev:next        # Start only Next.js
npm run dev:convex      # Start only Convex
npm run verify-setup    # Verify development environment is configured correctly
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Lint code
npm run lint:strict     # Lint with zero warnings
npm run format          # Format with Prettier
npm run typecheck       # TypeScript type checking
npm run test            # Run Vitest tests
npm run test:watch      # Run tests in watch mode
npm run generate:changelog  # Generate changelog manually
```

💡 **Tip:** Run `npm run verify-setup` after pulling changes to catch environment issues early.

### Code Quality

The project enforces:

- TypeScript strict mode
- ESLint with Next.js config
- Prettier formatting
- No build warnings allowed (CI)

### Testing

Uses Vitest for unit tests and Convex Test for backend testing.

```bash
npm run test         # Run once
npm run test:watch   # Watch mode
```

## 🎨 Customization

### Timer Settings

Edit `app/page.tsx`:

```typescript
const WORK_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes
```

### Level Thresholds

Use admin panel at `/admin` or edit `convex/levels.ts`:

```typescript
{ level: 1, title: "Beginner", threshold: 1 },
{ level: 2, title: "Focused", threshold: 5 },
// ... add more levels
```

### Challenges

Create via admin panel at `/admin` or seed defaults:

```bash
# In Convex dashboard function runner
mutation: seedDefaultChallenges
```

## 📚 Documentation

- **[Development Setup](./docs/setup/development.md)** - Local environment setup
- **[Production Setup](./docs/setup/production.md)** - Deploy to production
- **[Testing Guide](./docs/testing/guide.md)** - Testing strategies
- **[Architecture](./ARCHITECTURE.md)** - System design and technical decisions
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
- **[Documentation Index](./docs/README.md)** - Complete documentation navigation

---

## 📄 License

ISC

## 🙏 Acknowledgments

- [Pomodoro Technique](https://francescocirillo.com/products/the-pomodoro-technique) by Francesco Cirillo
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
