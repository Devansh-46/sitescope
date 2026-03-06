// lib/lighthouse.ts
// Re-exports LighthouseScores shape + runLighthouse for backwards compatibility.
// Internally delegates to lib/pagespeed.ts (Google PageSpeed Insights API).
// No Chrome, no system libraries — works perfectly on Vercel serverless.

import { runPageSpeed, toLighthouseScores } from './pagespeed';

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

/**
 * Fetches desktop PageSpeed Insights scores for a URL.
 * Never throws — returns available:false on any error.
 */
export async function runLighthouse(url: string): Promise<LighthouseScores> {
  const report = await runPageSpeed(url);
  return toLighthouseScores(report.desktop) as LighthouseScores;
}