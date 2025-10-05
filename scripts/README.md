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

1. Read git commits from the last 30 days
2. Send them to Claude Haiku (cheapest model)
3. Claude intelligently extracts user-facing features
4. Groups similar changes together
5. Generates comprehensive but concise descriptions
6. Outputs to `lib/changelog-data.ts`

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

### When to Run

Run this script:

- Before deploying to production
- After significant feature development
- When you want to update the changelog page
- **Runs automatically in CI** on every build

The generated file is committed to git so the changelog is available at build time.

### Cost

Uses Claude 3 Haiku (cheapest model):

- ~$0.25 per 1M input tokens
- ~$1.25 per 1M output tokens
- Typical cost per run: **< $0.01**

### CI/CD

In GitHub Actions, set `ANTHROPIC_API_KEY` as a repository secret.

The workflow automatically generates the changelog on every build.
