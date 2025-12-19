/**
 * Tests for manifest module
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultManifest,
  getDefaultRepos,
  getEnabledRepos,
  getReposByCategory,
  getRepoPath,
} from '../src/core/manifest.js';

describe('getDefaultRepos', () => {
  it('returns expected number of repos', () => {
    const repos = getDefaultRepos();
    expect(repos.length).toBe(15);
  });

  it('has correct categories', () => {
    const repos = getDefaultRepos();
    const categories = [...new Set(repos.map((r) => r.category))];
    expect(categories).toContain('source');
    expect(categories).toContain('glue');
    expect(categories).toContain('example');
  });

  it('has one disabled repo by default', () => {
    const repos = getDefaultRepos();
    const disabled = repos.filter((r) => !r.enabled);
    expect(disabled.length).toBe(1);
    expect(disabled[0].id).toBe('better-auth-tanstack-starter');
  });

  it('includes expected source repos', () => {
    const repos = getDefaultRepos();
    const sourceIds = repos.filter((r) => r.category === 'source').map((r) => r.id);
    expect(sourceIds).toContain('tanstack-router');
    expect(sourceIds).toContain('tanstack-query');
    expect(sourceIds).toContain('tanstack-table');
    expect(sourceIds).toContain('tanstack-form');
    expect(sourceIds).toContain('better-auth-main');
    expect(sourceIds).toContain('shadcn-ui');
  });

  it('includes expected glue repos', () => {
    const repos = getDefaultRepos();
    const glueIds = repos.filter((r) => r.category === 'glue').map((r) => r.id);
    expect(glueIds).toContain('better-auth-convex');
    expect(glueIds).toContain('convex-react-query');
    expect(glueIds).toContain('convex-tanstack-start');
    expect(glueIds).toContain('convex-helpers');
  });
});

describe('getDefaultManifest', () => {
  it('returns manifest with version 1', () => {
    const manifest = getDefaultManifest();
    expect(manifest.version).toBe(1);
  });

  it('has correct default root path', () => {
    const manifest = getDefaultManifest();
    expect(manifest.defaultRoot).toContain('Reference Repos');
  });

  it('has default store name', () => {
    const manifest = getDefaultManifest();
    expect(manifest.defaultStore).toBe('wok-ops-platform');
  });
});

describe('getEnabledRepos', () => {
  it('filters out disabled repos', () => {
    const manifest = getDefaultManifest();
    const enabled = getEnabledRepos(manifest);
    expect(enabled.length).toBe(14);
    expect(enabled.every((r) => r.enabled)).toBe(true);
  });
});

describe('getReposByCategory', () => {
  it('groups repos by category', () => {
    const manifest = getDefaultManifest();
    const grouped = getReposByCategory(manifest);

    expect(grouped.source.length).toBe(6);
    expect(grouped.glue.length).toBe(4);
    expect(grouped.example.length).toBe(5);
  });
});

describe('getRepoPath', () => {
  it('joins root and localDir correctly', () => {
    const result = getRepoPath('/home/user/repos', 'my-repo');
    expect(result).toBe('/home/user/repos/my-repo');
  });

  it('handles paths with spaces', () => {
    const result = getRepoPath('/home/user/Reference Repos', 'my-repo');
    expect(result).toBe('/home/user/Reference Repos/my-repo');
  });
});
