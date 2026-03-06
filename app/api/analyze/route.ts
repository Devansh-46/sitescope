// app/api/analyze/route.ts
// POST /api/analyze
// Creates report instantly → returns reportId → background processing begins
// PageSpeed runs separately via /api/pagespeed (client-side, non-blocking)

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

const AnalyzeRequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

// ── Background pipeline ───────────────────────────────────────
async function runAnalysisPipeline(reportId: string, url: string) {
  const { supabase } = await import('@/lib/supabase');
  const { scrapePage } = await import('@/lib/scraper');
  const { generateAuditReport } = await import('@/lib/ai');

  // PageSpeed is NOT in this pipeline — it runs client-side via /api/pagespeed
  // This keeps the pipeline fast: scrape (~10s) + Gemini (~15s) = ~25s total

  const pipelineTimeout = setTimeout(async () => {
    console.error('[pipeline] Timed out after 55 seconds');
    try {
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: 'Analysis timed out. Please try again.',
      }).eq('id', reportId);
    } catch { /* ignore */ }
  }, 55_000);

  try {
    // 1. Scrape
    console.log('[pipeline] Starting scrape for', url);
    await supabase.from('reports').update({ status: 'SCRAPING' }).eq('id', reportId);

    let scrapedData;
    try {
      scrapedData = await scrapePage(url);
      console.log('[pipeline] Scrape complete');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scraping failed';
      console.error('[pipeline] Scrape failed:', msg);
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: `Could not access the website: ${msg}`,
      }).eq('id', reportId);
      clearTimeout(pipelineTimeout);
      return;
    }

    await supabase.from('reports').update({ scraped_data: scrapedData }).eq('id', reportId);

    // 2. AI analysis — pass empty lighthouse data (PageSpeed loads separately)
    console.log('[pipeline] Starting Gemini AI analysis...');
    await supabase.from('reports').update({ status: 'ANALYZING' }).eq('id', reportId);

    const emptyLighthouse = {
      available: false,
      performance: -1, accessibility: -1, bestPractices: -1, seo: -1,
      firstContentfulPaint: 'N/A', largestContentfulPaint: 'N/A',
      totalBlockingTime: 'N/A', cumulativeLayoutShift: 'N/A',
      speedIndex: 'N/A', timeToInteractive: 'N/A',
      opportunities: [], diagnostics: [],
    };

    let auditResult;
    try {
      auditResult = await generateAuditReport(scrapedData, emptyLighthouse);
      console.log('[pipeline] AI analysis complete. Score:', auditResult.overallScore);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed';
      console.error('[pipeline] AI failed:', msg);
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: `AI analysis failed: ${msg}`,
      }).eq('id', reportId);
      clearTimeout(pipelineTimeout);
      return;
    }

    // 3. Mark complete
    clearTimeout(pipelineTimeout);
    const { error: updateError } = await supabase.from('reports').update({
      audit_result: auditResult,
      overall_score: auditResult.overallScore,
      status: 'COMPLETE',
    }).eq('id', reportId);

    if (updateError) {
      console.error('[pipeline] Failed to mark COMPLETE:', updateError);
    } else {
      console.log('[pipeline] Successfully marked COMPLETE for report', reportId);
    }

  } catch (error) {
    clearTimeout(pipelineTimeout);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[pipeline] Unhandled error:', error);
    try {
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: message,
      }).eq('id', reportId);
    } catch { /* ignore */ }
  }
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON in request body', 400);
    }

    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid URL', 400);
    }

    const { url } = parsed.data;
    const domain = extractDomain(url);
    const { supabase } = await import('@/lib/supabase');

    const { data: report, error: createError } = await supabase
      .from('reports')
      .insert({ url, domain, status: 'PENDING' })
      .select('id')
      .single();

    if (createError || !report) {
      console.error('[analyze] DB insert error:', createError);
      return jsonError(`Database error: ${createError?.message ?? 'Could not create report'}`);
    }

    console.log('[analyze] Created report', report.id, 'for', url);
    after(runAnalysisPipeline(report.id, url));

    return NextResponse.json(
      { reportId: report.id, status: 'processing' },
      { status: 202 }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    console.error('[/api/analyze] Unhandled error:', error);
    return jsonError(message);
  }
}

export const maxDuration = 60;
