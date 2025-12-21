/**
 * Tests for baseline module
 */

import { describe, it, expect } from 'vitest';
import { compareToBaseline, type Baseline } from '../src/core/baseline.js';

describe('compareToBaseline', () => {
  const createBaseline = (files: string[]): Baseline => ({
    timestamp: new Date().toISOString(),
    fileCount: files.length,
    files: files.sort(),
  });

  it('detects new files', () => {
    const baseline = createBaseline(['a.ts', 'b.ts']);
    const current = ['a.ts', 'b.ts', 'c.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual(['c.ts']);
    expect(diff.removedFiles).toEqual([]);
  });

  it('detects removed files', () => {
    const baseline = createBaseline(['a.ts', 'b.ts', 'c.ts']);
    const current = ['a.ts', 'b.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual([]);
    expect(diff.removedFiles).toEqual(['c.ts']);
  });

  it('detects both new and removed files', () => {
    const baseline = createBaseline(['a.ts', 'b.ts', 'old.ts']);
    const current = ['a.ts', 'b.ts', 'new.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual(['new.ts']);
    expect(diff.removedFiles).toEqual(['old.ts']);
  });

  it('returns empty arrays when no changes', () => {
    const baseline = createBaseline(['a.ts', 'b.ts', 'c.ts']);
    const current = ['a.ts', 'b.ts', 'c.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual([]);
    expect(diff.removedFiles).toEqual([]);
  });

  it('handles empty baseline', () => {
    const baseline = createBaseline([]);
    const current = ['a.ts', 'b.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual(['a.ts', 'b.ts']);
    expect(diff.removedFiles).toEqual([]);
  });

  it('handles empty current files', () => {
    const baseline = createBaseline(['a.ts', 'b.ts']);
    const current: string[] = [];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual([]);
    expect(diff.removedFiles).toEqual(['a.ts', 'b.ts']);
  });

  it('handles paths with directories', () => {
    const baseline = createBaseline([
      'repo-a/src/index.ts',
      'repo-a/src/utils.ts',
      'repo-b/lib/helper.ts',
    ]);
    const current = [
      'repo-a/src/index.ts',
      'repo-a/src/new-file.ts',
      'repo-b/lib/helper.ts',
    ];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual(['repo-a/src/new-file.ts']);
    expect(diff.removedFiles).toEqual(['repo-a/src/utils.ts']);
  });

  it('returns sorted results', () => {
    const baseline = createBaseline(['z.ts', 'a.ts']);
    const current = ['m.ts', 'b.ts'];

    const diff = compareToBaseline(current, baseline);

    // New files should be sorted
    expect(diff.newFiles).toEqual(['b.ts', 'm.ts']);
    // Removed files should be sorted
    expect(diff.removedFiles).toEqual(['a.ts', 'z.ts']);
  });

  it('handles duplicate files in current (edge case)', () => {
    const baseline = createBaseline(['a.ts', 'b.ts']);
    // Duplicates in current array (shouldn't happen but testing robustness)
    const current = ['a.ts', 'a.ts', 'c.ts'];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles).toEqual(['c.ts']);
    expect(diff.removedFiles).toEqual(['b.ts']);
  });

  it('handles large file lists efficiently', () => {
    // Generate 1000 baseline files
    const baselineFiles = Array.from({ length: 1000 }, (_, i) => `file-${i.toString().padStart(4, '0')}.ts`);
    const baseline = createBaseline(baselineFiles);

    // Remove first 100, keep middle 800, add 100 new
    const current = [
      ...baselineFiles.slice(100, 900),
      ...Array.from({ length: 100 }, (_, i) => `new-file-${i}.ts`),
    ];

    const diff = compareToBaseline(current, baseline);

    expect(diff.newFiles.length).toBe(100);
    expect(diff.removedFiles.length).toBe(200); // 100 from start + 100 from end
    expect(diff.newFiles.every((f) => f.startsWith('new-file-'))).toBe(true);
  });
});
