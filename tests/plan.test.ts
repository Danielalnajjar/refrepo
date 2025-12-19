/**
 * Tests for plan module
 */

import { describe, it, expect } from 'vitest';
import { formatBytes } from '../src/core/plan.js';
import { PLAN_THRESHOLDS } from '../src/core/constants.js';

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500.0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

describe('PLAN_THRESHOLDS', () => {
  it('has warning thresholds', () => {
    expect(PLAN_THRESHOLDS.maxTotalBytesWarning).toBe(15 * 1024 * 1024);
    expect(PLAN_THRESHOLDS.maxFileCountWarning).toBe(2_500);
  });

  it('has error thresholds', () => {
    expect(PLAN_THRESHOLDS.maxTotalBytesError).toBe(50 * 1024 * 1024);
    expect(PLAN_THRESHOLDS.maxFileCountError).toBe(10_000);
  });

  it('error thresholds are higher than warning thresholds', () => {
    expect(PLAN_THRESHOLDS.maxTotalBytesError).toBeGreaterThan(
      PLAN_THRESHOLDS.maxTotalBytesWarning
    );
    expect(PLAN_THRESHOLDS.maxFileCountError).toBeGreaterThan(
      PLAN_THRESHOLDS.maxFileCountWarning
    );
  });
});
