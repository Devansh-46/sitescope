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
    const encodedUrl = encodeURIComponent(url);
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    // Must build URL manually — URLSearchParams.set() deduplicates keys,
    // which would drop all but the last `category` parameter
    const fullUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
      + `?url=${encodedUrl}`
      + `&strategy=desktop`
      + `&category=performance`
      + `&category=accessibility`
      + `&category=best-practices`
      + `&category=seo`
      + keyParam;

    console.log('[Lighthouse] Starting PageSpeed Insights fetch for:', url);
    const startTime = Date.now();

    // 90s timeout — PageSpeed API can take up to 60s for slow sites
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error('[Lighthouse] Aborting — exceeded 90s timeout');
      controller.abort();
    }, 90_000);

    const response = await fetch(fullUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const elapsed = Date.now() - startTime;
    console.log(`[Lighthouse] API responded in ${elapsed}ms with status ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PageSpeed API ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`PageSpeed API error: ${JSON.stringify(data.error).slice(0, 200)}`);
    }

    const lhr = data.lighthouseResult;
    if (!lhr) {
      const keys = Object.keys(data).join(', ');
      throw new Error(`No lighthouseResult in response. Top-level keys: ${keys}`);
    }

    const { categories: cats, audits } = lhr;
    if (!cats) throw new Error('lighthouseResult.categories is missing');
    if (!audits) throw new Error('lighthouseResult.audits is missing');

    console.log('[Lighthouse] Available categories:', Object.keys(cats).join(', '));

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

    const result = {
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

    console.log(`[Lighthouse] ✓ Perf:${result.performance} A11y:${result.accessibility} BP:${result.bestPractices} SEO:${result.seo}`);
    return result;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Lighthouse] ✗ Failed:', msg);
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