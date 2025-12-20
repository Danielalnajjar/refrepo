# refrepo

CLI tool for managing reference repository collections with [mgrep](https://github.com/mixedbread-ai/mgrep) semantic search.

## Overview

refrepo helps you maintain a curated collection of reference repositories for semantic code search. It handles:

- **Repository Management**: Clone and sync multiple repos from a manifest
- **Ignore Rules**: Generate `.mgrepignore` files with smart defaults and repo-specific exclusions
- **Index Planning**: Preview what will be indexed with file count/size analysis
- **Safety Gates**: Block indexing when thresholds are exceeded
- **Reporting**: Generate HTML dashboards showing repository status

## Installation

```bash
npm install -g refrepo
```

## Quick Start

```bash
# Initialize a manifest with default repositories
refrepo init

# Clone/update all repositories
refrepo sync

# Preview what will be indexed
refrepo plan

# Generate .mgrepignore file
refrepo ignore build --global

# Run mgrep indexing
refrepo index

# Generate HTML status report
refrepo report --open
```

## Commands

| Command | Description |
|---------|-------------|
| `refrepo init` | Initialize manifest with default repos |
| `refrepo status` | Check repository states |
| `refrepo sync` | Clone/update all repositories |
| `refrepo plan` | Preview indexing scope with warnings |
| `refrepo ignore build` | Generate .mgrepignore files |
| `refrepo index` | Run mgrep indexing with safety checks |
| `refrepo report` | Generate HTML status dashboard |
| `refrepo doctor` | Check system dependencies |

## Configuration

### Manifest File

The manifest (`refrepo.manifest.yaml`) defines your repository collection:

```yaml
version: 1
defaultRoot: ~/code/Reference Repos
defaultStore: my-mgrep-store
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

refrepo includes comprehensive ignore rules for:

- Build outputs (`dist/`, `node_modules/`, `.next/`)
- Lock files (`pnpm-lock.yaml`, `package-lock.json`)
- Binary assets (images, fonts, videos)
- Test files and coverage
- IDE and OS files

Repo-specific exclusions filter out non-React framework code from TanStack packages.

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
| `REFREPO_ROOT` | Override default repository root |
| `REFREPO_STORE` | Override default mgrep store name |

## Requirements

- Node.js 20+
- [mgrep](https://github.com/mixedbread-ai/mgrep) for semantic search
- Git
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

## License

MIT
