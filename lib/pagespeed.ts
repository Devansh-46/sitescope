// lib/pagespeed.ts
// Dedicated Google PageSpeed Insights API library
// Fetches both mobile + desktop scores, Core Web Vitals, opportunities, and diagnostics
// Free tier: 25,000 req/day — add PAGESPEED_API_KEY env var for higher limits

export interface PageSpeedMetrics {
  score: number;           // 0–100
  firstContentfulPaint: string;
  largestContentfulPaint: string;
  totalBlockingTime: string;
  cumulativeLayoutShift: string;
  speedIndex: string;
  timeToInteractive: string;
  opportunities: PageSpeedOpportunity[];
  diagnostics: PageSpeedDiagnostic[];
}

export interface PageSpeedOpportunity {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsBytes?: number;
  displaySavings: string;
}

export interface PageSpeedDiagnostic {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue: string;
}

export interface PageSpeedCategoryScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PageSpeedResult {
  available: boolean;
  url: string;
  strategy: 'mobile' | 'desktop';
  fetchedAt: string;
  categories: PageSpeedCategoryScores;
  metrics: PageSpeedMetrics;
  // Raw screenshot thumbnail (base64 data URL) if available
  screenshotDataUrl?: string;
  errorMessage?: string;
}

export interface PageSpeedReport {
  url: string;
  fetchedAt: string;
  desktop: PageSpeedResult;
  mobile: PageSpeedResult;
}

// ─── Internal fetcher ──────────────────────────────────────────────────────

async function fetchPageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY ?? '';
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  const encodedUrl = encodeURIComponent(url);

  const apiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodedUrl}` +
    `&strategy=${strategy}` +
    `&category=performance` +
    `&category=accessibility` +
    `&category=best-practices` +
    `&category=seo` +
    keyParam;

  const base: PageSpeedResult = {
    available: false,
    url,
    strategy,
    fetchedAt: new Date().toISOString(),
    categories: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    metrics: {
      score: 0,
      firstContentfulPaint: 'N/A',
      largestContentfulPaint: 'N/A',
      totalBlockingTime: 'N/A',
      cumulativeLayoutShift: 'N/A',
      speedIndex: 'N/A',
      timeToInteractive: 'N/A',
      opportunities: [],
      diagnostics: [],
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 150_000);
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Daily quota exceeded. Add a PAGESPEED_API_KEY env var in Vercel to get a higher limit.');
      }
      const text = await response.text();
      throw new Error(`PageSpeed API ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    if (data.error) {
      if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
        throw new Error('Daily quota exceeded. Add a PAGESPEED_API_KEY env var in Vercel to get a higher limit.');
      }
      throw new Error(`API error: ${JSON.stringify(data.error).slice(0, 200)}`);
    }

    const lhr = data.lighthouseResult;
    if (!lhr) throw new Error('No lighthouseResult in response');

    const { categories: cats, audits } = lhr;

    const catScore = (key: string): number =>
      Math.round(((cats[key]?.score ?? 0) as number) * 100);

    const metricVal = (id: string): string =>
      ((audits[id]?.displayValue) as string) ?? 'N/A';

    const opportunities: PageSpeedOpportunity[] = Object.values(
      audits as Record<string, any>
    )
      .filter(
        (a) =>
          a.details?.type === 'opportunity' &&
          a.score !== null &&
          a.score < 0.9 &&
          (a.details?.overallSavingsMs ?? 0) > 100
      )
      .sort(
        (a, b) =>
          (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0)
      )
      .slice(0, 8)
      .map((a) => ({
        id: a.id ?? '',
        title: a.title ?? '',
        description: a.description ?? '',
        savingsMs: Math.round(a.details?.overallSavingsMs ?? 0),
        savingsBytes: a.details?.overallSavingsBytes,
        displaySavings: a.details?.overallSavingsMs
          ? `Save ~${(a.details.overallSavingsMs / 1000).toFixed(1)}s`
          : 'Improvement available',
      }));

    const diagnostics: PageSpeedDiagnostic[] = Object.values(
      audits as Record<string, any>
    )
      .filter(
        (a) =>
          a.details?.type === 'table' &&
          a.score !== null &&
          a.score < 0.9 &&
          a.title
      )
      .slice(0, 8)
      .map((a) => ({
        id: a.id ?? '',
        title: a.title ?? '',
        description: a.description ?? '',
        score: a.score !== null ? Math.round((a.score as number) * 100) : null,
        displayValue: (a.displayValue as string) ?? '',
      }));

    // Optional screenshot
    const screenshotDataUrl =
      (audits['final-screenshot']?.details?.data as string | undefined) ??
      (lhr.fullPageScreenshot?.screenshot?.data as string | undefined);

    return {
      available: true,
      url,
      strategy,
      fetchedAt: new Date().toISOString(),
      categories: {
        performance: catScore('performance'),
        accessibility: catScore('accessibility'),
        bestPractices: catScore('best-practices'),
        seo: catScore('seo'),
      },
      metrics: {
        score: catScore('performance'),
        firstContentfulPaint: metricVal('first-contentful-paint'),
        largestContentfulPaint: metricVal('largest-contentful-paint'),
        totalBlockingTime: metricVal('total-blocking-time'),
        cumulativeLayoutShift: metricVal('cumulative-layout-shift'),
        speedIndex: metricVal('speed-index'),
        timeToInteractive: metricVal('interactive'),
        opportunities,
        diagnostics,
      },
      screenshotDataUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PageSpeed] ${strategy} failed:`, msg);
    return { ...base, errorMessage: msg };
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

// LighthouseScores shape — kept for backwards compatibility with analyze/route.ts
export interface LighthouseScores {
  available: boolean;
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
  opportunities: { id: string; title: string; description: string; savings: string }[];
  diagnostics: string[];
}

/**
 * Fetch both mobile + desktop PageSpeed results in parallel.
 * Never throws — errors are captured in each result's `available` flag.
 */
export async function runPageSpeed(url: string): Promise<PageSpeedReport> {
  console.log('[PageSpeed] Running mobile + desktop for:', url);
  const [desktop, mobile] = await Promise.all([
    fetchPageSpeed(url, 'desktop'),
    fetchPageSpeed(url, 'mobile'),
  ]);
  console.log(
    `[PageSpeed] Done — desktop perf: ${desktop.categories.performance}, mobile perf: ${mobile.categories.performance}`
  );
  return { url, fetchedAt: new Date().toISOString(), desktop, mobile };
}

/**
 * Lightweight adapter — converts a PageSpeedResult into the legacy
 * LighthouseScores shape so existing components keep working.
 */
/**
 * Alias for analyze/route.ts — fetches desktop PageSpeed scores.
 * Replaces the deleted lib/lighthouse.ts.
 * Never throws — returns available:false on any error.
 */
export async function runLighthouse(url: string): Promise<LighthouseScores> {
  const report = await runPageSpeed(url);
  return toLighthouseScores(report.desktop);
}

export function toLighthouseScores(result: PageSpeedResult): LighthouseScores {
  if (!result.available) {
    return {
      available: false,
      performance: -1, accessibility: -1, bestPractices: -1, seo: -1,
      firstContentfulPaint: 'N/A', largestContentfulPaint: 'N/A',
      totalBlockingTime: 'N/A', cumulativeLayoutShift: 'N/A',
      speedIndex: 'N/A', timeToInteractive: 'N/A',
      opportunities: [], diagnostics: [],
    };
  }
  return {
    available: true,
    performance: result.categories.performance,
    accessibility: result.categories.accessibility,
    bestPractices: result.categories.bestPractices,
    seo: result.categories.seo,
    firstContentfulPaint: result.metrics.firstContentfulPaint,
    largestContentfulPaint: result.metrics.largestContentfulPaint,
    totalBlockingTime: result.metrics.totalBlockingTime,
    cumulativeLayoutShift: result.metrics.cumulativeLayoutShift,
    speedIndex: result.metrics.speedIndex,
    timeToInteractive: result.metrics.timeToInteractive,
    opportunities: result.metrics.opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      savings: o.displaySavings,
    })),
    diagnostics: result.metrics.diagnostics.map((d) => d.title),
  };
}
