# Scripts

## Generate Changelog

Automatically generates the changelog from git commit history using **Claude AI** (Haiku model).

### Setup

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or add it to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from: https://console.anthropic.com/

### Usage

```bash
npm run generate:changelog
```

This will:

1. Read git commits from **yesterday** (previous day)
2. **Check if already processed** - if yes, skip (runs once per day)
3. Send them to Claude Haiku (cheapest model)
4. Claude intelligently extracts user-facing features
5. Groups similar changes together
6. Generates comprehensive but concise descriptions
7. **Prepends** to existing changelog (builds full history)
8. Outputs to `lib/changelog-data.ts`

**Result:** Full changelog history, generated incrementally once per day.

### What Claude Does

**Claude intelligently filters out:**

- Backend infrastructure (Convex, Clerk, database)
- Build/CI/deployment changes
- Code refactoring, formatting, linting
- Minor UI tweaks
- Documentation changes

**Claude includes:**

- New features users can see and use
- Major UX improvements
- Important functionality additions

**Claude also:**

- Groups related commits (e.g., "add notifications" + "add sound" → "Completion notifications with sound")
- Writes from user's perspective
- Keeps descriptions concise (max 20 words)
- Limits to 5 changes per day

### How It Works

**Automatic (CI):**

- Runs on every push to `main`
- Checks if yesterday's commits are already in changelog
- If already processed → skips (no API call, no cost)
- If not processed → generates summary and adds to changelog
- **Result:** Runs once per day on the first commit

**Manual:**
You can run it locally anytime:

```bash
npm run generate:changelog
```

**Full History:**

- Changelog contains ALL days since the script was set up
- Each day's entry is added incrementally
- Never overwrites or loses history
- Committed to git for deployment

### Cost Optimization

**Yesterday-only processing:**

- Only processes commits from yesterday (not last 30 days)
- Merges incrementally with existing changelog
- Runs once per day maximum

**CI optimization:**

- Only runs on `main` branch pushes (not PRs)
- Skipped if no commits yesterday

**Typical cost:**

- Claude 3 Haiku: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens
- **< $0.01 per run**
- **~$0.30/month** if you commit every day

### CI/CD

In GitHub Actions, set `ANTHROPIC_API_KEY` as a repository secret:

1. Go to Settings → Secrets and variables → Actions
2. Add secret: `ANTHROPIC_API_KEY`
3. Value: Your API key from console.anthropic.com

The workflow automatically generates the changelog once per day on main branch pushes.
