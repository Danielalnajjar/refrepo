/**
 * Manifest management - loading, saving, and default repos
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { validateManifest, safeValidateManifest } from './schema.js';
import { DEFAULT_ROOT, DEFAULT_STORE, DEFAULT_MANIFEST_NAME } from './constants.js';
import type { Manifest, RepoConfig } from './types.js';

/**
 * Default repository configurations
 * Matches existing repos + new repos from plan
 */
export function getDefaultRepos(): RepoConfig[] {
  return [
    // ============================================
    // SOURCE REPOS - Core libraries
    // ============================================
    {
      id: 'tanstack-router',
      name: 'TanStack Router',
      url: 'https://github.com/TanStack/router.git',
      branch: 'main',
      category: 'source',
      localDir: 'tanstack-router',
      enabled: true,
    },
    {
      id: 'tanstack-query',
      name: 'TanStack Query',
      url: 'https://github.com/TanStack/query.git',
      branch: 'main',
      category: 'source',
      localDir: 'tanstack-query',
      enabled: true,
    },
    {
      id: 'tanstack-table',
      name: 'TanStack Table',
      url: 'https://github.com/TanStack/table.git',
      branch: 'main',
      category: 'source',
      localDir: 'table-main',
      enabled: true,
    },
    {
      id: 'tanstack-form',
      name: 'TanStack Form',
      url: 'https://github.com/TanStack/form.git',
      branch: 'main',
      category: 'source',
      localDir: 'tanstack-form',
      enabled: true,
    },
    {
      id: 'better-auth-main',
      name: 'Better Auth',
      url: 'https://github.com/better-auth/better-auth.git',
      branch: 'main',
      category: 'source',
      localDir: 'better-auth-main',
      enabled: true,
    },
    {
      id: 'shadcn-ui',
      name: 'shadcn/ui',
      url: 'https://github.com/shadcn-ui/ui.git',
      branch: 'main',
      category: 'source',
      localDir: 'shadcn-ui',
      enabled: true,
    },

    // ============================================
    // GLUE REPOS - Integration patterns
    // ============================================
    {
      id: 'better-auth-convex',
      name: 'Better Auth Convex Adapter',
      url: 'https://github.com/get-convex/better-auth.git',
      branch: 'main',
      category: 'glue',
      localDir: 'better-auth-convex',
      enabled: true,
    },
    {
      id: 'convex-react-query',
      name: 'Convex React Query',
      url: 'https://github.com/get-convex/convex-react-query.git',
      branch: 'main',
      category: 'glue',
      localDir: 'convex-react-query',
      enabled: true,
    },
    {
      id: 'convex-tanstack-start',
      name: 'Convex TanStack Start',
      url: 'https://github.com/get-convex/convex-tanstack-start.git',
      branch: 'main',
      category: 'glue',
      localDir: 'convex-tanstack-start-main',
      enabled: true,
    },
    {
      id: 'convex-helpers',
      name: 'Convex Helpers',
      url: 'https://github.com/get-convex/convex-helpers.git',
      branch: 'main',
      category: 'glue',
      localDir: 'convex-helpers',
      enabled: true,
    },

    // ============================================
    // EXAMPLE REPOS - Reference implementations
    // ============================================
    {
      id: 'tanstack-ai-demo',
      name: 'TanStack AI Demo',
      url: 'https://github.com/rs-4/tanstack-ai-demo.git',
      branch: 'main',
      category: 'example',
      localDir: 'tanstack-ai-demo',
      enabled: true,
    },
    {
      id: 'tanstack-start-breadcrumbs',
      name: 'TanStack Start Breadcrumbs Example',
      url: 'https://github.com/kurochenko/tanstack-start-breadcrumbs-example.git',
      branch: 'master',
      category: 'example',
      localDir: 'tanstack-start-breadcrumbs-example',
      enabled: true,
    },
    {
      id: 'tanstack-start-dashboard',
      name: 'TanStack Start Dashboard',
      url: 'https://github.com/Kiranism/tanstack-start-dashboard.git',
      branch: 'main',
      category: 'example',
      localDir: 'tanstack-start-dashboard',
      enabled: true,
    },
    {
      id: 'turborepo-shadcn-ui',
      name: 'Turborepo shadcn/ui Template',
      url: 'https://github.com/dan5py/turborepo-shadcn-ui.git',
      branch: 'main',
      category: 'example',
      localDir: 'turborepo-shadcn-ui',
      enabled: true,
    },

    // ============================================
    // OPTIONAL REPOS - Disabled by default
    // ============================================
    {
      id: 'better-auth-tanstack-starter',
      name: 'Better Auth TanStack Starter (Drizzle/Postgres)',
      url: 'https://github.com/daveyplate/better-auth-tanstack-starter.git',
      branch: 'main',
      category: 'example',
      localDir: 'better-auth-tanstack-starter',
      enabled: false, // Disabled: Drizzle/Postgres may cause confusion
    },
  ];
}

/**
 * Get the default manifest configuration
 */
export function getDefaultManifest(): Manifest {
  return {
    version: 1,
    defaultRoot: DEFAULT_ROOT,
    defaultStore: DEFAULT_STORE,
    repos: getDefaultRepos(),
  };
}

/**
 * Search upward from a directory for the manifest file
 */
function findManifestUpward(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const candidate = path.join(currentDir, DEFAULT_MANIFEST_NAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory too
  const rootCandidate = path.join(root, DEFAULT_MANIFEST_NAME);
  if (fs.existsSync(rootCandidate)) {
    return rootCandidate;
  }

  return null;
}

/**
 * Resolve the manifest file path
 * Priority: override arg > REFREPO_MANIFEST env > search upward from cwd
 */
export function resolveManifestPath(override?: string): string {
  if (override) return path.resolve(override);

  // Check environment variable
  const envPath = process.env.REFREPO_MANIFEST;
  if (envPath) {
    return path.resolve(envPath);
  }

  // First check current directory
  const cwdPath = path.resolve(process.cwd(), DEFAULT_MANIFEST_NAME);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  // Search upward through parent directories
  const found = findManifestUpward(process.cwd());
  if (found) {
    return found;
  }

  // Return cwd path for error messaging (file doesn't exist)
  return cwdPath;
}

/**
 * Check if manifest file exists
 */
export function manifestExists(manifestPath?: string): boolean {
  const resolved = resolveManifestPath(manifestPath);
  return fs.existsSync(resolved);
}

/**
 * Load and validate manifest from file
 */
export function loadManifest(manifestPath?: string): Manifest {
  const resolved = resolveManifestPath(manifestPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Manifest not found: ${resolved}\nRun 'refrepo init' to create one.`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const data = parseYaml(content);

  return validateManifest(data);
}

/**
 * Safely load manifest, returning result object
 */
export function safeLoadManifest(manifestPath?: string): {
  success: boolean;
  data?: Manifest;
  error?: string;
  path?: string;
} {
  const resolved = resolveManifestPath(manifestPath);

  try {
    const data = loadManifest(manifestPath);
    return { success: true, data, path: resolved };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      path: resolved,
    };
  }
}

/**
 * Save manifest to file
 */
export function saveManifest(manifest: Manifest, manifestPath?: string): string {
  const resolved = resolveManifestPath(manifestPath);

  // Ensure directory exists
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = stringifyYaml(manifest, {
    indent: 2,
    lineWidth: 120,
  });

  fs.writeFileSync(resolved, content, 'utf-8');
  return resolved;
}

/**
 * Get the full path for a repo within the root
 */
export function getRepoPath(root: string, localDir: string): string {
  return path.join(root, localDir);
}

/**
 * Get enabled repos from manifest
 */
export function getEnabledRepos(manifest: Manifest): RepoConfig[] {
  return manifest.repos.filter((r) => r.enabled);
}

/**
 * Get repos grouped by category
 */
export function getReposByCategory(manifest: Manifest): Record<string, RepoConfig[]> {
  const grouped: Record<string, RepoConfig[]> = {
    source: [],
    glue: [],
    example: [],
  };

  for (const repo of manifest.repos) {
    grouped[repo.category].push(repo);
  }

  return grouped;
}

/**
 * Add custom ignore patterns to manifest
 */
export function addCustomIgnores(patterns: string[], manifestPath?: string): {
  success: boolean;
  added: string[];
  error?: string;
} {
  try {
    const manifest = loadManifest(manifestPath);

    // Initialize customIgnores if not present
    if (!manifest.customIgnores) {
      manifest.customIgnores = [];
    }

    // Add only new patterns (avoid duplicates)
    const existingSet = new Set(manifest.customIgnores);
    const added: string[] = [];

    for (const pattern of patterns) {
      if (!existingSet.has(pattern)) {
        manifest.customIgnores.push(pattern);
        added.push(pattern);
      }
    }

    if (added.length > 0) {
      saveManifest(manifest, manifestPath);
    }

    return { success: true, added };
  } catch (err) {
    return {
      success: false,
      added: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
