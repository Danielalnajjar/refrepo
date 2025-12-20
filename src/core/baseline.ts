/**
 * Baseline file tracking for plan comparisons
 * Saves/loads list of indexed files to detect changes between runs
 */

import * as fs from 'fs';
import * as path from 'path';

const BASELINE_FILENAME = '.refrepo-baseline.json';

export interface Baseline {
  timestamp: string;
  fileCount: number;
  files: string[];  // Relative paths from repo root
}

/**
 * Get baseline file path (stored in manifest directory)
 */
function getBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

/**
 * Load existing baseline, if any
 */
export function loadBaseline(): Baseline | null {
  const baselinePath = getBaselinePath();

  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(baselinePath, 'utf-8');
    return JSON.parse(content) as Baseline;
  } catch {
    return null;
  }
}

/**
 * Save baseline after successful index
 */
export function saveBaseline(files: string[]): void {
  const baseline: Baseline = {
    timestamp: new Date().toISOString(),
    fileCount: files.length,
    files: files.sort(),
  };

  const baselinePath = getBaselinePath();
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf-8');
}

/**
 * Compare current files to baseline
 */
export function compareToBaseline(
  currentFiles: string[],
  baseline: Baseline
): { newFiles: string[]; removedFiles: string[] } {
  const currentSet = new Set(currentFiles);
  const baselineSet = new Set(baseline.files);

  const newFiles: string[] = [];
  const removedFiles: string[] = [];

  // Find new files (in current but not in baseline)
  for (const file of currentFiles) {
    if (!baselineSet.has(file)) {
      newFiles.push(file);
    }
  }

  // Find removed files (in baseline but not in current)
  for (const file of baseline.files) {
    if (!currentSet.has(file)) {
      removedFiles.push(file);
    }
  }

  return {
    newFiles: newFiles.sort(),
    removedFiles: removedFiles.sort(),
  };
}
