// lib/lighthouse.ts
// Runs Google Lighthouse v11 programmatically to extract performance scores
// Uses chrome-launcher to spin up a Chrome instance

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  firstContentfulPaint: string;
  largestContentfulPaint: string;
  totalBlockingTime: string;
  cumulativeLayoutShift: string;
  speedIndex: string;
  timeToInteractive: string;
  opportunities: LighthouseOpportunity[];
  diagnostics: string[];
}

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  savings: string;
}

/**
 * Runs Lighthouse on the given URL and returns structured scores.
 * Falls back to placeholder scores if Lighthouse fails.
 */
export async function runLighthouse(url: string): Promise<LighthouseScores> {
  try {
    // Dynamic imports — Lighthouse v11 is ESM-only
    const { default: lighthouse } = await import('lighthouse');
    const chromeLauncher = await import('chrome-launcher');

    const chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const options = {
      logLevel: 'error' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      formFactor: 'desktop' as const,
      throttlingMethod: 'simulate' as const,
    };

    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    if (!runnerResult?.lhr) throw new Error('Lighthouse returned no results');

    const { lhr } = runnerResult;
    const { categories, audits } = lhr;

    const opportunities: LighthouseOpportunity[] = Object.values(audits)
      .filter((a) => a.details?.type === 'opportunity' && a.score !== null && (a.score as number) < 0.9)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        savings: (a.details as any)?.overallSavingsMs
          ? `Potential savings of ${((a.details as any).overallSavingsMs / 1000).toFixed(1)}s`
          : 'Improvement opportunity',
      }));

    const diagnostics: string[] = Object.values(audits)
      .filter((a) => a.details?.type === 'table' && a.score !== null && (a.score as number) < 0.5 && a.title)
      .slice(0, 5)
      .map((a) => a.title);

    const score = (key: string): number => Math.round(((categories[key]?.score as number) ?? 0) * 100);
    const metricValue = (id: string): string => (audits[id]?.displayValue as string) ?? 'N/A';

    return {
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      firstContentfulPaint: metricValue('first-contentful-paint'),
      largestContentfulPaint: metricValue('largest-contentful-paint'),
      totalBlockingTime: metricValue('total-blocking-time'),
      cumulativeLayoutShift: metricValue('cumulative-layout-shift'),
      speedIndex: metricValue('speed-index'),
      timeToInteractive: metricValue('interactive'),
      opportunities,
      diagnostics,
    };
  } catch (error) {
    console.error('[Lighthouse] Failed:', error);
    // Graceful fallback — report still generates via AI
    return {
      performance: 0, accessibility: 0, bestPractices: 0, seo: 0,
      firstContentfulPaint: 'N/A', largestContentfulPaint: 'N/A',
      totalBlockingTime: 'N/A', cumulativeLayoutShift: 'N/A',
      speedIndex: 'N/A', timeToInteractive: 'N/A',
      opportunities: [],
      diagnostics: ['Lighthouse analysis unavailable — Chrome not found or timed out.'],
    };
  }
}