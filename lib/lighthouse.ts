// lib/lighthouse.ts
// Fetches Lighthouse scores via Google PageSpeed Insights API
// No Chrome, no system libraries — works perfectly on Vercel serverless
// Free API: 25,000 requests/day (no key needed, or add PAGESPEED_API_KEY for higher limits)

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
  available: boolean;
}

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  savings: string;
}

export async function runLighthouse(url: string): Promise<LighthouseScores> {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY ?? '';

    // Build URL manually — URLSearchParams deduplicates keys, breaking multi-category requests
    const encodedUrl = encodeURIComponent(url);
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const fullUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=desktop&category=performance&category=accessibility&category=best-practices&category=seo${keyParam}`;

    console.log('[Lighthouse] Fetching PageSpeed Insights for:', url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    const response = await fetch(fullUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PageSpeed API ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const lhr = data.lighthouseResult;

    if (!lhr) {
      throw new Error(`No lighthouseResult in response. Keys: ${Object.keys(data).join(', ')}`);
    }

    const { categories: cats, audits } = lhr;

    if (!cats || !audits) {
      throw new Error('Missing categories or audits in lighthouseResult');
    }

    const score = (key: string): number =>
      Math.round(((cats[key]?.score ?? 0) as number) * 100);

    const metricValue = (id: string): string =>
      ((audits[id]?.displayValue) as string) ?? 'N/A';

    const opportunities: LighthouseOpportunity[] = Object.values(audits as Record<string, any>)
      .filter((a) => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
      .slice(0, 5)
      .map((a) => ({
        id: a.id ?? '',
        title: a.title ?? '',
        description: a.description ?? '',
        savings: a.details?.overallSavingsMs
          ? `Potential savings of ${(a.details.overallSavingsMs / 1000).toFixed(1)}s`
          : 'Improvement opportunity',
      }));

    const diagnostics: string[] = Object.values(audits as Record<string, any>)
      .filter((a) => a.details?.type === 'table' && a.score !== null && a.score < 0.5 && a.title)
      .slice(0, 5)
      .map((a) => a.title as string);

    const perf = score('performance');
    const acc = score('accessibility');
    const bp = score('best-practices');
    const seo = score('seo');

    console.log(`[Lighthouse] Done — Perf:${perf} A11y:${acc} BP:${bp} SEO:${seo}`);

    return {
      available: true,
      performance: perf,
      accessibility: acc,
      bestPractices: bp,
      seo,
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
    console.error('[Lighthouse] PageSpeed failed:', error instanceof Error ? error.message : error);
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
}
