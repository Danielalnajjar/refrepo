/**
 * Tests for ignore module
 */

import { describe, it, expect } from 'vitest';
import {
  GLOBAL_IGNORE_PATTERNS,
  getRepoIgnoreConfig,
  buildIgnoreContent,
  REPO_SPECIFIC_IGNORES,
} from '../src/core/ignore-rules.js';

describe('GLOBAL_IGNORE_PATTERNS', () => {
  it('includes node_modules', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('node_modules/');
  });

  it('includes common build outputs', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('dist/');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('build/');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('.next/');
  });

  it('includes lockfiles', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('pnpm-lock.yaml');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('package-lock.json');
  });

  it('includes binary assets', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('*.png');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('*.jpg');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('*.woff*');
  });

  it('includes test patterns', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('*.test.ts');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('*.spec.ts');
  });

  it('includes secrets patterns', () => {
    expect(GLOBAL_IGNORE_PATTERNS).toContain('.env');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('.env.*');
    expect(GLOBAL_IGNORE_PATTERNS).toContain('!.env.example');
  });
});

describe('REPO_SPECIFIC_IGNORES', () => {
  it('has configs for major repos', () => {
    const ids = REPO_SPECIFIC_IGNORES.map((r) => r.id);
    expect(ids).toContain('tanstack-router');
    expect(ids).toContain('tanstack-query');
    expect(ids).toContain('better-auth-main');
    expect(ids).toContain('shadcn-ui');
  });

  it('tanstack-router excludes non-React frameworks', () => {
    const config = getRepoIgnoreConfig('tanstack-router');
    expect(config).toBeDefined();
    expect(config!.dropPaths).toContain('packages/solid-router/');
    expect(config!.dropPaths).toContain('packages/vue-router/');
  });

  it('tanstack-query excludes non-React frameworks', () => {
    const config = getRepoIgnoreConfig('tanstack-query');
    expect(config).toBeDefined();
    expect(config!.dropPaths).toContain('packages/vue-query/');
    expect(config!.dropPaths).toContain('packages/solid-query/');
  });

  it('better-auth excludes non-relevant packages', () => {
    const config = getRepoIgnoreConfig('better-auth-main');
    expect(config).toBeDefined();
    expect(config!.dropPaths.some((p) => p.includes('packages/stripe'))).toBe(true);
  });
});

describe('getRepoIgnoreConfig', () => {
  it('returns config for known repo', () => {
    const config = getRepoIgnoreConfig('tanstack-router');
    expect(config).toBeDefined();
    expect(config!.id).toBe('tanstack-router');
  });

  it('returns undefined for unknown repo', () => {
    const config = getRepoIgnoreConfig('unknown-repo');
    expect(config).toBeUndefined();
  });
});

describe('buildIgnoreContent', () => {
  it('includes header comment', () => {
    const content = buildIgnoreContent('tanstack-router');
    expect(content).toContain('AUTO-GENERATED');
  });

  it('includes global patterns', () => {
    const content = buildIgnoreContent('tanstack-router');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
  });

  it('includes repo-specific patterns', () => {
    const content = buildIgnoreContent('tanstack-router');
    expect(content).toContain('packages/solid-router/');
    expect(content).toContain('packages/vue-router/');
  });

  it('does not include repo-specific for unknown repos', () => {
    const content = buildIgnoreContent('unknown-repo');
    expect(content).toContain('node_modules/');
    expect(content).not.toContain('packages/solid-router/');
  });
});
