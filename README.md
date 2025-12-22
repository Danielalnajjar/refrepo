# refrepo

CLI tool for managing reference repository collections with [mgrep](https://github.com/mixedbread-ai/mgrep) semantic search.

## Overview

refrepo helps you maintain a curated collection of reference repositories for semantic code search. It handles:

- **Repository Management**: Clone and sync multiple repos from a manifest
- **Ignore Rules**: Generate `.mgrepignore` files with smart defaults and repo-specific exclusions
- **Index Planning**: Preview what will be indexed with file count/size analysis
- **Change Tracking**: Detect new files since last index for easy review
- **AI Suggestions**: Use Claude to analyze new files and recommend ignore rules
- **Safety Gates**: Block indexing when thresholds are exceeded
- **Reporting**: Generate HTML dashboards showing repository status

## Installation

```bash
npm install -g refrepo
```

## Why This Tool?

mgrep indexes directories for semantic code search, but managing multiple reference repositories manually is tedious:
- Cloning/updating 15+ repos
- Filtering out non-relevant code (Vue/Solid packages when you only use React)
- Preventing accidental indexing of `node_modules` or build artifacts
- Tracking what's indexed and what needs updating

refrepo automates this with a manifest-driven approach and safety gates.

## Workflows

### Initial Setup
```bash
refrepo init                    # Create manifest with default repos
refrepo sync                    # Clone all repositories
refrepo ignore build --global   # Generate .mgrepignore
refrepo plan                    # Verify file counts look reasonable
refrepo index --dry-run         # Preview what mgrep will index
refrepo index                   # Actually index to mgrep store
```

### Weekly Update
```bash
refrepo sync                    # Pull latest changes
refrepo plan                    # See new files since last index
refrepo suggest --apply         # (Optional) AI adds ignore rules for irrelevant files
refrepo plan                    # Verify file counts after ignoring
refrepo index                   # Re-index updated files
```

The `plan` command shows which files are new since your last index:
```
Changes since last index
  (baseline from 12/15/2025)

  + 5 new files:
    tanstack-router/packages/react-router/src/newFeature.ts
    ...
```

If Claude suggests ignoring some files, `suggest --apply` adds them to your manifest and regenerates `.mgrepignore` automatically.

### Adding a New Repository

**Step 1**: Edit `refrepo.manifest.yaml` and add a repo entry:
```yaml
repos:
  # ... existing repos ...
  - id: my-new-repo           # Unique identifier (used for ignore rules)
    name: My New Repo         # Display name
    url: https://github.com/org/repo.git
    branch: main
    category: source          # source | glue | example
    localDir: my-new-repo     # Folder name under defaultRoot
    enabled: true
```

**Step 2**: Clone and verify:
```bash
refrepo sync                    # Clone the new repo
refrepo plan                    # Check file counts - are they reasonable?
```

**Step 3** (optional): If the repo has large sections you don't need, analyze its structure:

```bash
# Generate a directory tree (install: npm install -g tree-cli)
tree -L 3 -d ~/code/Reference\ Repos/my-new-repo > repo-tree.txt
```

Review `repo-tree.txt` (or share it with an LLM) and identify directories irrelevant to your stack (e.g., `packages/vue/`, `examples/angular/`). Then add repo-specific ignore rules - see [Ignore Rules](#ignore-rules) below.

**Step 4**: Regenerate ignore file and index:
```bash
refrepo ignore build --global   # Only needed if you added repo-specific rules
refrepo index --dry-run         # Preview
refrepo index                   # Index to mgrep
```

## Commands

| Command | Description |
|---------|-------------|
| `refrepo init` | Initialize manifest with default repos |
| `refrepo status` | Check repository states |
| `refrepo sync` | Clone/update all repositories |
| `refrepo plan` | Preview indexing scope, show new files since last index |
| `refrepo suggest` | Use Claude AI to recommend ignore rules (use `--apply` to auto-add) |
| `refrepo ignore build` | Generate .mgrepignore files |
| `refrepo index` | Run mgrep indexing with safety checks |
| `refrepo search <query>` | Search indexed content via mgrep |
| `refrepo report` | Generate HTML status dashboard |
| `refrepo doctor` | Check system dependencies |

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| `refrepo.manifest.yaml` | Current directory | Repository definitions and settings |
| `.mgrepignore` | Repository root | Ignore patterns for mgrep indexing |
| `.refrepo-baseline.json` | Current directory | Snapshot of indexed files (created after `index`) |
| `.refrepo-changes.json` | Current directory | New/removed files since baseline (updated after `plan`) |
| `refrepo-report-*.html` | Current directory | Generated HTML status reports |

## Configuration

### Manifest File

The manifest (`refrepo.manifest.yaml`) defines your repository collection:

```yaml
version: 1
defaultRoot: ~/code/Reference Repos
defaultStore: my-mgrep-store          # Named collection in Mixedbread cloud
repos:
  - id: tanstack-router
    name: TanStack Router
    url: https://github.com/TanStack/router.git
    branch: main
    category: source
    localDir: tanstack-router
    enabled: true
```

### Repository Categories

- **source**: Core libraries (TanStack, Better Auth, shadcn/ui)
- **glue**: Integration packages (Convex adapters, helpers)
- **example**: Reference implementations and templates

## Safety Thresholds

The plan command uses thresholds to prevent accidental large indexing:

| Level | File Count | Total Size |
|-------|------------|------------|
| 🟢 GREEN | < 2,500 | < 15 MB |
| 🟡 YELLOW | < 10,000 | < 50 MB |
| 🔴 RED | ≥ 10,000 | ≥ 50 MB |

RED status blocks indexing unless `--force` is used.

## Ignore Rules

Ignore rules determine what gets indexed. There are two tiers:

### Global Rules (apply to all repos)

Defined in `GLOBAL_IGNORE_PATTERNS` in `src/core/ignore-rules.ts`. These filter out:

- Build outputs (`dist/`, `node_modules/`, `.next/`)
- Lock files (`pnpm-lock.yaml`, `package-lock.json`)
- Binary assets (images, fonts, videos)
- Test files and coverage
- IDE and OS files

These apply automatically to every repo - no configuration needed.

### Repo-Specific Rules (optional)

For repos with large sections you don't need, add entries to `REPO_SPECIFIC_IGNORES` in `src/core/ignore-rules.ts`:

```typescript
{
  id: 'my-new-repo',              // Must match the id in manifest
  notes: 'Keep only React code',
  dropPaths: [
    'packages/vue/',              // Drop Vue implementation
    'packages/angular/',          // Drop Angular implementation
    'examples/solid/',            // Drop Solid examples
    'docs/api/',                  // Drop generated API docs
  ],
},
```

After editing, rebuild and regenerate:
```bash
pnpm build
refrepo ignore build --global
```

**When to add repo-specific rules**: Only if `refrepo plan` shows unexpectedly high file counts. The global rules handle most cases.

## JSON Mode

All commands support `--json` for automation-friendly output:

```bash
# Stdout contains only valid JSON; logs go to stderr
refrepo plan --json | jq .success
refrepo sync --json | jq .data.summary
refrepo index --dry-run --json | jq .data.filesUploaded
```

**Note**: In JSON mode, stdout contains only the JSON result. All progress logs are redirected to stderr.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MXBAI_API_KEY` | Mixedbread API key for mgrep (required for indexing) |
| `MIXEDBREAD_API_KEY` | Legacy name (deprecated, still accepted) |
| `REFREPO_MANIFEST` | Path to manifest file (overrides directory search) |
| `REFREPO_ROOT` | Override default repository root |
| `REFREPO_STORE` | Override default mgrep store name |

## Requirements

- Node.js 20+
- [mgrep](https://github.com/mixedbread-ai/mgrep) for semantic search
- Git
- [Claude Code](https://claude.ai/code) (optional, for `refrepo suggest` command)
- Works on Linux, macOS, and Windows

## Verification

After installation, verify the setup:

```bash
# Check dependencies
refrepo doctor

# Verify JSON output is clean (should output: true)
refrepo plan --json 2>/dev/null | jq -e .success

# Run tests
pnpm test
```

## Change Tracking

refrepo tracks what files were indexed and shows you what's new on subsequent runs.

### How It Works

1. **After `refrepo index`**: A baseline is saved (`.refrepo-baseline.json`) with all indexed file paths
2. **On `refrepo plan`**: New and removed files are shown compared to the baseline
3. **Changes file**: `.refrepo-changes.json` is saved for automation/AI analysis

### AI-Powered Suggestions

The `refrepo suggest` command calls Claude Code to analyze new files:

```bash
refrepo plan              # Detect new files, save to .refrepo-changes.json
refrepo suggest           # Claude analyzes and recommends ignore patterns
refrepo suggest --apply   # Apply patterns to manifest and regenerate .mgrepignore
```

**Preview mode** (`refrepo suggest`):
```
Analyzing new files with Claude...
Found 3 new files

Suggestions:

## IGNORE (2 files)
- `packages/vue-router/` - Vue code, not relevant to React stack
- `examples/angular/` - Angular examples

## KEEP (1 file)
- `packages/react-router/newFeature.ts` - React, relevant to stack

Run `refrepo suggest --apply` to apply these patterns
```

**Apply mode** (`refrepo suggest --apply`):
```
Analyzing new files with Claude...
Found 3 new files

Patterns to ignore:
  tanstack-router/packages/vue-router/
  tanstack-query/examples/angular/

✓ Added 2 pattern(s) to manifest
✓ Regenerated .mgrepignore

Run `refrepo plan` to see updated file counts
```

The patterns are saved to `customIgnores` in your manifest file:
```yaml
# refrepo.manifest.yaml
customIgnores:
  - tanstack-router/packages/vue-router/
  - tanstack-query/examples/angular/
```

**Note**: Requires [Claude Code](https://claude.ai/code) to be installed and authenticated.

## Architecture

```
refrepo.manifest.yaml     # Source of truth: repos, root path, store name
        ↓
   refrepo sync           # Clones/pulls repos to defaultRoot
        ↓
   refrepo ignore         # Generates .mgrepignore from ignore-rules.ts
        ↓
   refrepo plan           # Walks files, applies ignore rules, calculates totals
        ↓                   Saves .refrepo-changes.json with new files
   refrepo suggest        # (Optional) Claude analyzes new files
        ↓
   refrepo index          # Runs `mgrep watch` to sync files to Mixedbread store
                            Saves .refrepo-baseline.json for future comparisons
```

Key source files:
- `src/core/ignore-rules.ts` - Global and per-repo ignore patterns
- `src/core/plan.ts` - File walking and threshold logic
- `src/core/manifest.ts` - Manifest loading and repo definitions
- `src/core/baseline.ts` - Baseline tracking for change detection

## License

MIT
