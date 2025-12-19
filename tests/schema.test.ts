/**
 * Tests for manifest schema validation
 */

import { describe, it, expect } from 'vitest';
import { validateManifest, safeValidateManifest, ManifestSchema } from '../src/core/schema.js';

describe('ManifestSchema', () => {
  it('validates a minimal valid manifest', () => {
    const manifest = {
      version: 1,
      repos: [],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(true);
    expect(result.data?.version).toBe(1);
    expect(result.data?.repos).toEqual([]);
  });

  it('validates a full manifest with repos', () => {
    const manifest = {
      version: 1,
      defaultRoot: '/home/user/code/repos',
      defaultStore: 'my-store',
      repos: [
        {
          id: 'test-repo',
          name: 'Test Repository',
          url: 'https://github.com/user/repo.git',
          branch: 'main',
          category: 'source',
          localDir: 'test-repo',
          enabled: true,
        },
      ],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(true);
    expect(result.data?.repos).toHaveLength(1);
    expect(result.data?.repos[0].id).toBe('test-repo');
  });

  it('rejects manifest without version', () => {
    const manifest = {
      repos: [],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects repo with invalid URL', () => {
    const manifest = {
      version: 1,
      repos: [
        {
          id: 'test',
          name: 'Test',
          url: 'not-a-url',
          category: 'source',
          localDir: 'test',
        },
      ],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects repo with invalid category', () => {
    const manifest = {
      version: 1,
      repos: [
        {
          id: 'test',
          name: 'Test',
          url: 'https://github.com/user/repo.git',
          category: 'invalid',
          localDir: 'test',
        },
      ],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(false);
  });

  it('applies default values', () => {
    const manifest = {
      version: 1,
      repos: [
        {
          id: 'test',
          name: 'Test',
          url: 'https://github.com/user/repo.git',
          category: 'source',
          localDir: 'test',
        },
      ],
    };

    const result = safeValidateManifest(manifest);
    expect(result.success).toBe(true);
    // Check defaults are applied
    expect(result.data?.repos[0].branch).toBe('main');
    expect(result.data?.repos[0].enabled).toBe(true);
  });
});
