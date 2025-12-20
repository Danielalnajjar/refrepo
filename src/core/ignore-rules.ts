/**
 * Global and repo-specific ignore rules for mgrep indexing
 */

/**
 * Global ignore patterns applied to all repos
 * Uses gitignore syntax
 */
export const GLOBAL_IGNORE_PATTERNS = [
  // ===========================================
  // Lock files and package manifests
  // ===========================================
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',

  // ===========================================
  // Build artifacts
  // ===========================================
  'dist/',
  'build/',
  'es/',
  '.output/',
  '.next/',
  '.nuxt/',
  '.svelte-kit/',
  '.vinxi/',
  '.nx/',
  '.tshy/',
  'node_modules/',

  // ===========================================
  // Additional build/deploy caches
  // ===========================================
  '.turbo/',
  '.vercel/',
  '.wrangler/',
  '.vite/',
  '.cache/',
  '.parcel-cache/',
  '.rollup.cache/',
  '.server-tmp/',
  'app-build/',

  // ===========================================
  // Non-React Framework Source Files
  // ===========================================
  '*.svelte',
  '*.vue',
  '*.astro',

  // ===========================================
  // Cloudflare Workers Config (excluded deployment target)
  // ===========================================
  'wrangler.jsonc',
  'wrangler.toml',
  'worker-configuration.d.ts',

  // ===========================================
  // Drizzle ORM (excluded - use Convex instead)
  // ===========================================
  'drizzle/',
  'drizzle.config.ts',

  // ===========================================
  // Generated Code
  // ===========================================
  '_generated/',
  '*.gen.ts',
  '*.gen.js',

  // ===========================================
  // Git/CI metadata
  // ===========================================
  '.git/',
  '.github/',
  '.changeset/',
  'codecov.yml',
  'labeler-config.yml',
  '.gitattributes',

  // ===========================================
  // Project meta docs (not implementation)
  // ===========================================
  'CONTRIBUTING.md',
  'FUNDING.json',

  // ===========================================
  // Test Files & Fixtures
  // ===========================================
  '*.test.ts',
  '*.test.tsx',
  '*.test.js',
  '*.test.jsx',
  '*.spec.ts',
  '*.spec.tsx',
  '*.test.*.ts',
  'tests/fixtures/',
  '__fixtures__/',
  'test-results/',
  'coverage/',
  '__snapshots__/',
  '*.snap',
  '*.notest.*',
  '*.test-d.ts',

  // ===========================================
  // Config Files (tooling, not patterns)
  // NOTE: turbo.json intentionally kept for Turborepo reference
  // ===========================================
  'biome.json',
  'knip.json',
  'knip.jsonc',
  'tsdown.config.ts',
  'tsup.config.ts',
  '.prettierrc*',
  '.eslintrc*',
  'eslint.config.*',
  'vitest.config.*',
  'jest.config.*',
  'playwright.config.*',

  // ===========================================
  // Binary/archive files
  // ===========================================
  '*.zip',
  '*.tar.gz',
  '*.rar',
  '*.db',
  '*.sqlite',
  '*.sqlite3',

  // ===========================================
  // Web manifests (favicon config)
  // ===========================================
  'site.webmanifest',

  // ===========================================
  // Media/binary assets
  // ===========================================
  'media/',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.ico',
  '*.svg',
  '*.webp',
  '*.woff*',
  '*.ttf',
  '*.eot',
  '*.pdf',

  // ===========================================
  // Environment files (secrets protection)
  // ===========================================
  '.env',
  '.env.*',
  '!.env.example',

  // ===========================================
  // IDE/Editor directories
  // ===========================================
  '.vscode/',
  '.idea/',
  '.cursor/',
  '.claude/',

  // ===========================================
  // Spellcheck metadata
  // ===========================================
  '.cspell/',
  '.cspell.json',
  '.cspell.jsonc',

  // ===========================================
  // OS system files
  // ===========================================
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',

  // ===========================================
  // Convex local state (contains auth tokens)
  // ===========================================
  '.convex/',

  // ===========================================
  // Log Files
  // ===========================================
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'pnpm-debug.log*',

  // ===========================================
  // TypeScript Build Cache
  // ===========================================
  '*.tsbuildinfo',
] as const;

/**
 * Repo-specific ignore rules
 * These are added on top of global rules for specific repos
 */
export interface RepoIgnoreConfig {
  id: string;
  dropPaths: string[];
  keepPaths?: string[];  // For documentation - not enforced in denylist mode
  notes?: string;
}

export const REPO_SPECIFIC_IGNORES: RepoIgnoreConfig[] = [
  // ===========================================
  // TANSTACK ROUTER
  // ===========================================
  {
    id: 'tanstack-router',
    notes: 'Keep React + Start only, drop other frameworks',
    dropPaths: [
      // Non-React framework packages
      'packages/solid-router/',
      'packages/solid-start/',
      'packages/solid-start-client/',
      'packages/solid-start-server/',
      'packages/solid-router-devtools/',
      'packages/solid-router-ssr-query/',
      'packages/vue-router/',
      'packages/vue-router-devtools/',
      'packages/vue-router-ssr-query/',
      'packages/vue-start/',
      'packages/vue-start-client/',
      'packages/vue-start-server/',
      'packages/arktype-adapter/',
      'packages/valibot-adapter/',

      // Non-React framework docs
      'docs/router/framework/solid/',
      'docs/router/framework/vue/',
      'docs/start/framework/solid/',
      'docs/router/api/',
      'docs/router/framework/react/installation/',
      'docs/router/framework/react/how-to/drafts/',
      'docs/router/framework/react/how-to/migrate-from-react-router.md',
      'docs/router/framework/react/how-to/migrate-from-react-location.md',
      'docs/router/framework/react/how-to/integrate-chakra-ui.md',
      'docs/router/framework/react/how-to/integrate-material-ui.md',
      'docs/router/framework/react/how-to/integrate-framer-motion.md',
      'docs/start/framework/react/migrate-from-next-js.md',

      // Vue and Solid examples/e2e
      'examples/vue/',
      'examples/solid/',
      'e2e/',

      // React examples we don't need
      'examples/react/basic/',
      'examples/react/basic-file-based/',
      'examples/react/basic-react-query/',
      'examples/react/basic-devtools-panel/',
      'examples/react/basic-non-nested-devtools/',
      'examples/react/basic-default-search-params/',
      'examples/react/basic-virtual-inside-file-based/',
      'examples/react/quickstart/',
      'examples/react/quickstart-file-based/',
      'examples/react/quickstart-rspack-file-based/',
      'examples/react/quickstart-webpack-file-based/',
      'examples/react/quickstart-esbuild-file-based/',
      'examples/react/router-monorepo-react-vite/',
      'examples/react/router-monorepo-simple/',
      'examples/react/router-monorepo-simple-lazy/',
      'examples/react/kitchen-sink/',
      'examples/react/kitchen-sink-react-query/',
      'examples/react/large-file-based/',
      'examples/react/deferred-data/',
      'examples/react/i18n-paraglide/',
      'examples/react/scroll-restoration/',
      'examples/react/location-masking/',
      'examples/react/view-transitions/',
      'examples/react/with-framer-motion/',
      'examples/react/with-trpc/',
      'examples/react/with-trpc-react-query/',
      'examples/react/navigation-blocking/',
      'examples/react/search-validator-adapters/',
      'examples/react/start-clerk-basic/',
      'examples/react/start-supabase-basic/',
      'examples/react/start-workos/',
      'examples/react/start-large/',
      'examples/react/start-i18n-paraglide/',
      'examples/react/start-material-ui/',
      'examples/react/start-bun/',
      'examples/react/start-basic-cloudflare/',
      'examples/react/start-basic-rsc/',
      'examples/react/start-basic-static/',
      'examples/react/authenticated-routes-firebase/',
      'examples/react/authenticated-routes/',

      // Additional non-Start examples
      'examples/react/basic-react-query-file-based/',
      'examples/react/basic-ssr-file-based/',
      'examples/react/basic-ssr-streaming-file-based/',
      'examples/react/basic-virtual-file-based/',
      'examples/react/kitchen-sink-file-based/',
      'examples/react/kitchen-sink-react-query-file-based/',
      'examples/react/router-monorepo-react-query/',
      'examples/react/start-basic-auth/',
      'examples/react/start-basic-authjs/',
      'examples/react/start-bare/',
      'examples/react/start-counter/',
      'examples/react/start-trellaux/',

      // Build tooling
      'packages/nitro-v2-vite-plugin/',
      'packages/router-cli/',
      'packages/directive-functions-plugin/',
      'packages/router-generator/tests/',
      'packages/router-plugin/tests/',
      'packages/start-plugin-core/tests/',

      // Scripts/GPT
      'gpt/',
      'scripts/',
    ],
  },

  // ===========================================
  // TANSTACK QUERY
  // ===========================================
  {
    id: 'tanstack-query',
    notes: 'Keep React + core only',
    dropPaths: [
      // Non-React framework packages
      'packages/vue-query/',
      'packages/solid-query/',
      'packages/svelte-query/',
      'packages/angular-query-experimental/',
      'packages/vue-query-devtools/',
      'packages/solid-query-devtools/',
      'packages/svelte-query-devtools/',
      'packages/svelte-query-persist-client/',
      'packages/solid-query-persist-client/',
      'packages/angular-query-persist-client/',
      'packages/query-broadcast-client-experimental/',
      'packages/react-query-next-experimental/',
      'packages/query-codemods/',
      'packages/eslint-plugin-query/',

      // Devtools UI
      'packages/react-query-devtools/',
      'packages/query-devtools/src/icons/',
      'packages/query-devtools/src/theme.ts',
      'packages/query-devtools/src/constants.ts',
      'packages/query-devtools/src/PiPContext.tsx',
      'packages/query-devtools/src/DevtoolsComponent.tsx',
      'packages/query-devtools/src/DevtoolsPanelComponent.tsx',

      // Non-React framework docs/examples
      'docs/framework/vue/',
      'docs/framework/solid/',
      'docs/framework/svelte/',
      'docs/framework/angular/',
      'examples/angular/',
      'examples/solid/',
      'examples/svelte/',
      'examples/vue/',

      // React examples we don't need
      'examples/react/simple/',
      'examples/react/basic/',
      'examples/react/basic-graphql-request/',
      'examples/react/pagination/',
      'examples/react/prefetching/',
      'examples/react/optimistic-updates-cache/',
      'examples/react/optimistic-updates-ui/',
      'examples/react/infinite-query-with-max-pages/',
      'examples/react/auto-refetching/',
      'examples/react/load-more-infinite-scroll/',
      'examples/react/chat/',
      'examples/react/default-query-function/',
      'examples/react/devtools-panel/',
      'examples/react/offline/',
      'examples/react/playground/',
      'examples/react/rick-morty/',
      'examples/react/star-wars/',
      'examples/react/eslint-legacy/',
      'examples/react/shadow-dom/',
      'examples/react/react-native/',
      'examples/react/algolia/',
      'examples/react/nextjs/',
      'examples/react/nextjs-suspense-streaming/',

      // Utilities
      'packages/query-test-utils/',
      'packages/query-async-storage-persister/',
      'packages/query-sync-storage-persister/',
      'integrations/',
      'scripts/',

      // Stack-specific: Exclude non-TanStack-Start examples
      'examples/react/react-router/',
      'examples/react/nextjs-app-prefetching/',
    ],
  },

  // ===========================================
  // TANSTACK TABLE
  // ===========================================
  {
    id: 'tanstack-table',
    notes: 'Keep table-core, react-table, and dashboard examples',
    dropPaths: [
      // Non-React framework packages
      'packages/angular-table/',
      'packages/vue-table/',
      'packages/svelte-table/',
      'packages/solid-table/',
      'packages/lit-table/',
      'packages/qwik-table/',
      'packages/react-table-devtools/',

      // Non-React examples
      'examples/angular/',
      'examples/vue/',
      'examples/svelte/',
      'examples/solid/',
      'examples/lit/',
      'examples/qwik/',
      'examples/vanilla/',

      // React examples we don't need
      // KEPT for dashboard patterns: basic/, kitchen-sink/, editable-data/,
      //       column-pinning/, column-resizing-performant/, virtualized-infinite-scrolling/
      'examples/react/virtualized-rows/',
      'examples/react/virtualized-rows-experimental/',
      'examples/react/virtualized-columns/',
      'examples/react/virtualized-columns-experimental/',
      'examples/react/column-dnd/',
      'examples/react/column-ordering/',
      'examples/react/column-pinning-sticky/',
      'examples/react/column-sizing/',
      'examples/react/column-groups/',
      'examples/react/row-dnd/',
      'examples/react/row-pinning/',
      'examples/react/full-width-resizable-table/',
      'examples/react/full-width-table/',
      'examples/react/custom-features/',
      'examples/react/expanding/',
      'examples/react/grouping/',
      'examples/react/material-ui-pagination/',
      'examples/react/sub-components/',
      'examples/react/bootstrap/',

      // Docs/scripts
      'docs/',
      'media/',
      'scripts/',
    ],
  },

  // ===========================================
  // TANSTACK FORM
  // ===========================================
  {
    id: 'tanstack-form',
    notes: 'Keep React form + TanStack Start only',
    dropPaths: [
      // Non-React framework packages
      'packages/vue-form/',
      'packages/solid-form/',
      'packages/angular-form/',
      'packages/lit-form/',
      'packages/svelte-form/',
      'packages/solid-form-devtools/',

      // Non-React examples
      'examples/vue/',
      'examples/solid/',
      'examples/angular/',
      'examples/lit/',
      'examples/svelte/',

      // Non-React framework docs
      'docs/framework/angular/',
      'docs/framework/lit/',
      'docs/framework/solid/',
      'docs/framework/svelte/',
      'docs/framework/vue/',

      // Devtools packages
      'packages/form-devtools/',
      'packages/react-form-devtools/',

      // Stack-specific: Exclude Next.js and Remix (you use TanStack Start)
      'packages/react-form-nextjs/',
      'packages/react-form-remix/',
      'examples/react/remix/',
      'examples/react/next-server-actions/',
    ],
  },

  // ===========================================
  // BETTER AUTH
  // ===========================================
  {
    id: 'better-auth-main',
    notes: 'Keep core + TanStack integration, drop other frameworks/adapters',
    dropPaths: [
      // Docs site infrastructure
      'docs/app/',
      'docs/components/',
      'docs/public/',

      // High-token/low-signal docs content
      'docs/content/blogs/',
      'docs/content/changelogs/',
      'docs/content/docs/adapters/',

      // Test utilities
      'packages/better-auth/src/test-utils/',
      'packages/better-auth/src/adapters/create-test-suite.ts',
      'packages/better-auth/src/adapters/*/test/',
      'packages/better-auth/src/adapters/tests/',
      'e2e/',
      'test/',

      // Non-TanStack examples
      'examples/next/',
      'examples/react/',

      // Non-TanStack integrations
      'packages/better-auth/src/integrations/next-js.ts',
      'packages/better-auth/src/integrations/svelte-kit.ts',
      'packages/better-auth/src/integrations/solid-start.ts',

      // Non-React client code
      'packages/better-auth/src/client/solid/',
      'packages/better-auth/src/client/svelte/',
      'packages/better-auth/src/client/vue/',

      // Demo apps (not TanStack Start)
      'demo/nextjs/',
      'demo/stateless/',
      'demo/expo/',
      'demo/oidc-client/',

      // Mobile/non-web packages
      'packages/expo/',

      // Enterprise/specialist plugins
      'packages/cli/',
      'packages/stripe/',
      'packages/scim/',
      'packages/telemetry/',

      // Low-relevance plugins
      'packages/better-auth/src/plugins/admin/',
      'packages/better-auth/src/plugins/api-key/',
      'packages/better-auth/src/plugins/captcha/',
      'packages/better-auth/src/plugins/device-authorization/',
      'packages/better-auth/src/plugins/generic-oauth/',
      'packages/better-auth/src/plugins/haveibeenpwned/',
      'packages/better-auth/src/plugins/mcp/',
      'packages/better-auth/src/plugins/oauth-proxy/',
      'packages/better-auth/src/plugins/oidc-provider/',
      'packages/better-auth/src/plugins/one-tap/',
      'packages/better-auth/src/plugins/one-time-token/',
      'packages/better-auth/src/plugins/open-api/',
      'packages/better-auth/src/plugins/phone-number/',
      'packages/better-auth/src/plugins/siwe/',
      'packages/better-auth/src/plugins/username/',
      'packages/better-auth/src/plugins/bearer/',
      'packages/better-auth/src/plugins/custom-session/',
      'packages/better-auth/src/plugins/jwt/',
      'packages/better-auth/src/plugins/last-login-method/',
      'packages/better-auth/src/plugins/additional-fields/',

      // Niche social providers
      'packages/core/src/social-providers/twitch.ts',
      'packages/core/src/social-providers/discord.ts',
      'packages/core/src/social-providers/tiktok.ts',
      'packages/core/src/social-providers/twitter.ts',
      'packages/core/src/social-providers/spotify.ts',
      'packages/core/src/social-providers/reddit.ts',
      'packages/core/src/social-providers/notion.ts',
      'packages/core/src/social-providers/kick.ts',
      'packages/core/src/social-providers/roblox.ts',
      'packages/core/src/social-providers/kakao.ts',
      'packages/core/src/social-providers/naver.ts',
      'packages/core/src/social-providers/line.ts',
      'packages/core/src/social-providers/vk.ts',
      'packages/core/src/social-providers/figma.ts',
      'packages/core/src/social-providers/dropbox.ts',
      'packages/core/src/social-providers/paypal.ts',
      'packages/core/src/social-providers/polar.ts',
      'packages/core/src/social-providers/linear.ts',
      'packages/core/src/social-providers/huggingface.ts',
      'packages/core/src/social-providers/cognito.ts',
      'packages/core/src/social-providers/atlassian.ts',
    ],
  },

  // ===========================================
  // BETTER AUTH CONVEX
  // ===========================================
  {
    id: 'better-auth-convex',
    notes: 'Keep TanStack Start example + core src',
    dropPaths: [
      // Non-TanStack examples
      'examples/next/',
      'examples/react/',

      // Next.js integration
      'src/nextjs/',

      // Cross-domain plugin (not using)
      'src/plugins/cross-domain/',

      // Docs infrastructure
      'docs/app/',
      'docs/components/',
      'docs/lib/',

      // Non-TanStack Start framework guides
      'docs/content/docs/framework-guides/expo.mdx',
      'docs/content/docs/framework-guides/next.mdx',
      'docs/content/docs/framework-guides/react.mdx',
      'docs/content/docs/framework-guides/sveltekit.mdx',
    ],
  },

  // ===========================================
  // SHADCN UI
  // ===========================================
  {
    id: 'shadcn-ui',
    notes: 'Keep ONLY apps/v4/registry/new-york-v4/ui/, hooks/, lib/',
    dropPaths: [
      // Exclude top-level directories
      'packages/',
      'templates/',
      'deprecated/',
      'scripts/',

      // Exclude v4 app directories (website code)
      'apps/v4/app/',
      'apps/v4/components/',
      'apps/v4/content/',
      'apps/v4/hooks/',
      'apps/v4/lib/',
      'apps/v4/public/',
      'apps/v4/scripts/',
      'apps/v4/styles/',

      // Exclude registry parts we don't need
      'apps/v4/registry/bases/',
      'apps/v4/registry/icons/',
      'apps/v4/registry/styles/',
      'apps/v4/registry/new-york-v4/blocks/',
      'apps/v4/registry/new-york-v4/charts/',
      'apps/v4/registry/new-york-v4/examples/',
      'apps/v4/registry/new-york-v4/internal/',
    ],
  },

  // ===========================================
  // CONVEX HELPERS
  // ===========================================
  {
    id: 'convex-helpers',
    notes: 'Keep only high-value server modules (migrations, rateLimit, retries, triggers, pagination, relationships, filter, zod, rowLevelSecurity)',
    dropPaths: [
      // Exclude development/demo directories
      '.cursor/',
      'scripts/',
      'src/',
      'convex/',

      // Exclude package-level files we don't need
      'packages/convex-helpers/.npmignore',
      'packages/convex-helpers/generate-exports.mjs',
      'packages/convex-helpers/index.ts',
      'packages/convex-helpers/validators.ts',
      'packages/convex-helpers/standardSchema.ts',
      'packages/convex-helpers/browser.ts',
      'packages/convex-helpers/testing.ts',
      'packages/convex-helpers/server.ts',
      'packages/convex-helpers/react.ts',
      'packages/convex-helpers/react/',
      'packages/convex-helpers/cli/',

      // Exclude server modules we don't need
      'packages/convex-helpers/server/customFunctions.ts',
      'packages/convex-helpers/server/crud.ts',
      'packages/convex-helpers/server/sessions.ts',
      'packages/convex-helpers/server/hono.ts',
      'packages/convex-helpers/server/cors.ts',
      'packages/convex-helpers/server/compare.ts',
      'packages/convex-helpers/server/stream.ts',
      'packages/convex-helpers/server/zod3.ts',
      'packages/convex-helpers/server/zod4.ts',
    ],
  },

  // ===========================================
  // CONVEX TANSTACK START
  // ===========================================
  {
    id: 'convex-tanstack-start',
    notes: 'Critical reference repo - keep all source files',
    dropPaths: [],
  },

  // ===========================================
  // CONVEX REACT QUERY
  // ===========================================
  {
    id: 'convex-react-query',
    notes: 'Keep src, minimal exclusions',
    dropPaths: [],
  },

  // ===========================================
  // EXAMPLE REPOS
  // ===========================================
  {
    id: 'tanstack-ai-demo',
    notes: 'Exclude non-Convex DB patterns',
    dropPaths: [
      'src/db/',
      'docker-compose.yml',
    ],
  },
  {
    id: 'tanstack-start-breadcrumbs',
    notes: 'Example repo - keep all',
    dropPaths: [],
  },
  {
    id: 'tanstack-start-dashboard',
    notes: 'Dashboard example - keep routes and components',
    dropPaths: [],
  },
  {
    id: 'turborepo-shadcn-ui',
    notes: 'Turborepo template - exclude Next.js docs app',
    dropPaths: [
      'apps/docs/',
    ],
  },
];

/**
 * Get ignore rules for a specific repo
 */
export function getRepoIgnoreConfig(repoId: string): RepoIgnoreConfig | undefined {
  return REPO_SPECIFIC_IGNORES.find((r) => r.id === repoId);
}

/**
 * Build complete ignore content for a repo
 */
export function buildIgnoreContent(repoId: string): string {
  const lines: string[] = [
    '# ===========================================',
    '# AUTO-GENERATED by refrepo ignore build',
    '# Do not edit manually - changes will be overwritten',
    '# ===========================================',
    '',
    '# Global ignore rules',
  ];

  // Add global patterns with **/ prefix for recursive matching
  for (const pattern of GLOBAL_IGNORE_PATTERNS) {
    if (pattern.startsWith('!')) {
      // Negation patterns: ! must be first character on line
      lines.push(`!**/${pattern.slice(1)}`);
    } else {
      lines.push(`**/${pattern}`);
    }
  }

  // Add repo-specific patterns
  const repoConfig = getRepoIgnoreConfig(repoId);
  if (repoConfig && repoConfig.dropPaths.length > 0) {
    lines.push('');
    lines.push('# ===========================================');
    lines.push(`# Repo-specific: ${repoConfig.notes || repoId}`);
    lines.push('# ===========================================');

    for (const path of repoConfig.dropPaths) {
      lines.push(path);
    }
  }

  lines.push('');
  return lines.join('\n');
}
