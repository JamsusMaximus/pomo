# Scripts

## Generate Changelog

Automatically generates the changelog from git commit history.

### Usage

```bash
npm run generate:changelog
```

This will:

1. Read all git commits from the repository
2. Filter for conventional commits (`feat:`, `fix:`, `perf:`, `refactor:`)
3. Exclude minor changes (typos, formatting, etc.)
4. Group by date
5. Generate `lib/changelog-data.ts`

### Commit Message Format

Use conventional commits for automatic changelog generation:

- `feat: add new feature` → Shows as "New" in changelog
- `fix: resolve bug` → Shows as "Fixed" in changelog
- `perf: improve performance` → Shows as "Improved" in changelog
- `refactor: clean up code` → Shows as "Improved" in changelog

### When to Run

Run this script:

- Before deploying to production
- After significant feature development
- When you want to update the changelog page

The generated file is committed to git so the changelog is available at build time (including for Tauri static builds).

### Filtering

The script automatically filters out commits containing:

- typo, formatting, prettier, lint
- comment, readme, docs only
- whitespace, missing import

To exclude a commit from the changelog, use a different prefix (e.g., `chore:`, `style:`) or include one of these keywords.
