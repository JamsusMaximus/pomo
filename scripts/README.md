# Scripts Directory

Utility scripts for development, deployment, and maintenance.

## Development Scripts

### Clean Dev (`clean-dev.sh`)

**Quick cache cleanup and port recovery**

```bash
npm run dev:clean
```

**What it does:**

- Removes `.next` cache directory
- Kills any process on port 3000
- Restarts dev server

**When to use:**

- "Internal Server Error" in browser
- Port conflict errors
- Hot reload stops working
- After pulling code changes

See [Troubleshooting Internal Server Error](../docs/troubleshooting-internal-server-error.md) for details.

---

## Generate Changelog

Generates the changelog from git commit history using **Claude AI** (Haiku model).

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

**Manual Execution:**

Run the script when you want to generate/update the changelog:

```bash
npm run generate:changelog
```

**Processing:**

- Reads git commits from yesterday (previous day)
- Checks if already processed - if yes, skips (idempotent)
- Sends commits to Claude Haiku
- Prepends new entries to existing changelog
- Outputs to `lib/changelog-data.ts`

**Full History:**

- Changelog contains all days processed
- Each day's entry is added incrementally
- Never overwrites or loses history

### Cost Estimate

**Typical cost per run:**

- Claude 3 Haiku: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens
- **< $0.01 per run**
- Process entire history once, then run daily/weekly as needed
