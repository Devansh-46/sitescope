// lib/lighthouse.ts
// Runs Google Lighthouse v11 programmatically to extract performance scores
// Uses chrome-launcher to spin up a Chrome instance
// Returns null on Vercel/serverless where Chrome is unavailable

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
  available: boolean; // false when Chrome not found (Vercel)
}

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  savings: string;
}

/**
 * Runs Lighthouse on the given URL and returns structured scores.
 * Returns an object with available=false if Lighthouse cannot run (serverless env).
 */
export async function runLighthouse(url: string): Promise<LighthouseScores> {
  // On Vercel, Chrome is not available — skip immediately
  const isServerless =
    process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    console.log('[Lighthouse] Skipping — serverless environment detected, no Chrome available');
    return unavailableFallback();
  }

  try {
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
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    };

    const lighthouseTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Lighthouse timed out after 60s')), 60_000)
    );

    const runnerResult = await Promise.race([lighthouse(url, options), lighthouseTimeout]);
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
      available: true,
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
    return unavailableFallback();
  }
}

function unavailableFallback(): LighthouseScores {
  return {
    available: false,
    performance: -1,
    accessibility: -1,
    bestPractices: -1,
    seo: -1,
    firstContentfulPaint: 'N/A',
    largestContentfulPaint: 'N/A',
    totalBlockingTime: 'N/A',
    cumulativeLayoutShift: 'N/A',
    speedIndex: 'N/A',
    timeToInteractive: 'N/A',
    opportunities: [],
    diagnostics: [],
  };
}
