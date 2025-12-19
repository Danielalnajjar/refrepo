/**
 * refrepo report - Generate HTML report
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import chalk from 'chalk';
import { safeLoadManifest } from '../../core/manifest.js';
import { computePlan, formatBytes, type PlanSummary, type RepoPlanResult } from '../../core/plan.js';
import { DEFAULT_REPORTS_DIR, DEFAULT_REPORT_NAME } from '../../core/constants.js';
import type { CommandResult, WarningLevel } from '../../core/types.js';

interface ReportOptions {
  json?: boolean;
  root?: string;
  open?: boolean;
  output?: string;
}

interface ReportResult {
  outputPath: string;
  summary: PlanSummary;
}

export function createReportCommand(): Command {
  return new Command('report')
    .description('Generate HTML report')
    .option('--json', 'Output raw data as JSON instead of HTML')
    .option('--root <path>', 'Override root path')
    .option('--open', 'Open report in browser after generation')
    .option('--output <path>', 'Custom output path')
    .action(async (options: ReportOptions) => {
      const result = await runReport(options);

      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else if (result.success && result.data) {
        console.log(chalk.green('✓ Report generated'));
        console.log(`  ${result.data.outputPath}`);

        if (options.open) {
          openInBrowser(result.data.outputPath);
        }
      } else {
        console.error(chalk.red('Error:') + ' ' + result.error);
        process.exit(1);
      }
    });
}

async function runReport(options: ReportOptions): Promise<CommandResult<ReportResult>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  const manifest = manifestResult.data;

  console.log(chalk.dim('Computing plan data...'));

  try {
    const summary = computePlan(manifest);

    // Determine output path (write to project dir, not reference repos)
    const outputPath = options.output || path.join(
      process.cwd(),
      DEFAULT_REPORTS_DIR,
      DEFAULT_REPORT_NAME
    );

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate HTML
    console.log(chalk.dim('Generating HTML report...'));
    const html = generateHtmlReport(summary, manifest.defaultStore);

    // Write file
    fs.writeFileSync(outputPath, html, 'utf-8');

    return {
      success: true,
      data: {
        outputPath,
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function openInBrowser(filePath: string): void {
  const command = process.platform === 'darwin'
    ? `open "${filePath}"`
    : process.platform === 'win32'
      ? `start "" "${filePath}"`
      : `xdg-open "${filePath}"`;

  exec(command, (error) => {
    if (error) {
      console.log(chalk.yellow(`Could not open browser: ${error.message}`));
    }
  });
}

function getStatusColor(level: WarningLevel): string {
  switch (level) {
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'red': return '#ef4444';
  }
}

function getStatusLabel(level: WarningLevel): string {
  switch (level) {
    case 'green': return 'OK';
    case 'yellow': return 'WARN';
    case 'red': return 'HIGH';
  }
}

function generateRepoCard(repo: RepoPlanResult): string {
  const statusColor = getStatusColor(repo.warningLevel);
  const statusLabel = getStatusLabel(repo.warningLevel);

  const topExtensions = repo.extensionHistogram
    .slice(0, 5)
    .map(e => `<span class="ext-badge">${e.ext} (${e.count})</span>`)
    .join(' ');

  const warnings = repo.warnings.length > 0
    ? `<div class="warnings">${repo.warnings.map(w => `<div class="warning">⚠ ${w}</div>`).join('')}</div>`
    : '';

  return `
    <div class="repo-card">
      <div class="repo-header">
        <div class="repo-name">${repo.repoName}</div>
        <div class="status-badge" style="background: ${statusColor}">${statusLabel}</div>
      </div>
      <div class="repo-stats">
        <div class="stat">
          <span class="stat-value">${repo.includedFileCount.toLocaleString()}</span>
          <span class="stat-label">files</span>
        </div>
        <div class="stat">
          <span class="stat-value">${formatBytes(repo.includedTotalBytes)}</span>
          <span class="stat-label">size</span>
        </div>
      </div>
      <div class="extensions">${topExtensions}</div>
      ${warnings}
    </div>
  `;
}

function generateHtmlReport(summary: PlanSummary, store: string): string {
  const timestamp = new Date().toISOString();
  const overallColor = getStatusColor(summary.overallWarningLevel);
  const overallLabel = getStatusLabel(summary.overallWarningLevel);

  const repoCards = summary.repos.map(generateRepoCard).join('\n');

  // Group repos by category (infer from name patterns)
  const sourceRepos = summary.repos.filter(r =>
    r.repoName.includes('TanStack') || r.repoName.includes('Better Auth') && !r.repoName.includes('Convex')
  );
  const glueRepos = summary.repos.filter(r =>
    r.repoName.includes('Convex') || r.repoName.includes('Adapter')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reference Repos Report</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .summary-card.status {
      border: 2px solid ${overallColor};
    }

    .summary-label {
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .summary-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .summary-value.status {
      color: ${overallColor};
    }

    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #f1f5f9;
    }

    .repos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .repo-card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem;
    }

    .repo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .repo-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      color: white;
    }

    .repo-stats {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .extensions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .ext-badge {
      font-size: 0.75rem;
      background: #334155;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      color: #cbd5e1;
    }

    .warnings {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #334155;
    }

    .warning {
      font-size: 0.875rem;
      color: #fbbf24;
    }

    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 0.75rem;
      text-align: center;
    }

    .store-info {
      background: #334155;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      display: inline-block;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .store-info code {
      color: #7dd3fc;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Reference Repos Report</h1>
      <p class="subtitle">Generated ${new Date().toLocaleString()}</p>
    </header>

    <div class="store-info">
      mgrep store: <code>${store}</code>
    </div>

    <div class="summary-grid">
      <div class="summary-card status">
        <div class="summary-label">Overall Status</div>
        <div class="summary-value status">${overallLabel}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Repositories</div>
        <div class="summary-value">${summary.totals.repoCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Files</div>
        <div class="summary-value">${summary.totals.includedFileCount.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Size</div>
        <div class="summary-value">${formatBytes(summary.totals.includedTotalBytes)}</div>
      </div>
    </div>

    <h2>Repositories</h2>
    <div class="repos-grid">
      ${repoCards}
    </div>

    <footer>
      <p>Generated by refrepo • ${timestamp}</p>
    </footer>
  </div>
</body>
</html>`;
}
