/**
 * Tests for path utilities
 */

import { describe, it, expect } from 'vitest';
import { toPosixPath } from '../src/core/path.js';

describe('toPosixPath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(toPosixPath('a\\b\\c')).toBe('a/b/c');
  });

  it('handles deeply nested paths', () => {
    expect(toPosixPath('packages\\react\\src\\components\\Button.tsx')).toBe(
      'packages/react/src/components/Button.tsx'
    );
  });

  it('preserves forward slashes', () => {
    expect(toPosixPath('a/b/c')).toBe('a/b/c');
  });

  it('handles mixed slashes', () => {
    expect(toPosixPath('a\\b/c\\d')).toBe('a/b/c/d');
  });

  it('handles empty string', () => {
    expect(toPosixPath('')).toBe('');
  });

  it('handles single segment', () => {
    expect(toPosixPath('file.txt')).toBe('file.txt');
  });

  it('handles Windows-style absolute path', () => {
    // Note: This would be unusual input, but should still normalize
    expect(toPosixPath('C:\\Users\\daniel\\code')).toBe('C:/Users/daniel/code');
  });
});

describe('toPosixPath with ignore patterns', () => {
  // These tests verify the behavior that's critical for ignore matching on Windows

  it('normalizes node_modules path', () => {
    const windowsPath = 'packages\\my-app\\node_modules\\lodash\\index.js';
    const posixPath = toPosixPath(windowsPath);
    expect(posixPath).toBe('packages/my-app/node_modules/lodash/index.js');
    // This would now match the pattern 'node_modules/'
    expect(posixPath.includes('node_modules/')).toBe(true);
  });

  it('normalizes dist path', () => {
    const windowsPath = 'packages\\my-app\\dist\\bundle.js';
    const posixPath = toPosixPath(windowsPath);
    expect(posixPath).toBe('packages/my-app/dist/bundle.js');
    expect(posixPath.includes('dist/')).toBe(true);
  });
});
