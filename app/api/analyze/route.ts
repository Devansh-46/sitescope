// app/api/analyze/route.ts
// POST /api/analyze
// Creates report instantly → returns reportId → background processing begins
// Uses next/server after() so Vercel doesn't kill the process after the response is sent

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
  const { runLighthouse } = await import('@/lib/lighthouse');
  const { generateAuditReport } = await import('@/lib/ai');

  // Hard timeout — 280s (just under Vercel's 300s maxDuration)
  const pipelineTimeout = setTimeout(async () => {
    console.error('[pipeline] Timed out after 280 seconds');
    try {
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: 'Analysis timed out. The website may be slow or blocking automated access. Please try again.',
      }).eq('id', reportId);
    } catch { /* ignore */ }
  }, 280_000);

  try {
    // 1. Scrape + Lighthouse IN PARALLEL — saves 20-40 seconds
    console.log('[pipeline] Starting scrape + Lighthouse in parallel for', url);
    await supabase.from('reports').update({ status: 'SCRAPING' }).eq('id', reportId);

    let scrapedData;
    let lighthouseData;

    try {
      [scrapedData, lighthouseData] = await Promise.all([
        scrapePage(url),
        runLighthouse(url), // never throws — has internal fallback
      ]);
      console.log('[pipeline] Scrape complete. Lighthouse available:', lighthouseData.available);
      if (lighthouseData.available) {
        console.log(`[pipeline] Lighthouse scores — Perf:${lighthouseData.performance} A11y:${lighthouseData.accessibility} SEO:${lighthouseData.seo}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scraping failed';
      console.error('[pipeline] Scrape failed:', msg);
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: `Scraping failed: ${msg}`,
      }).eq('id', reportId);
      clearTimeout(pipelineTimeout);
      return;
    }

    // Save both scrape + lighthouse data together
    await supabase.from('reports').update({
      scraped_data: scrapedData,
      lighthouse_data: lighthouseData,
    }).eq('id', reportId);

    // 2. AI audit
    console.log('[pipeline] Starting Gemini AI analysis...');
    await supabase.from('reports').update({ status: 'ANALYZING' }).eq('id', reportId);

    let auditResult;
    try {
      auditResult = await generateAuditReport(scrapedData, lighthouseData);
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
      console.log('[pipeline] ✓ COMPLETE for report', reportId);
    }

  } catch (error) {
    clearTimeout(pipelineTimeout);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[pipeline] Unhandled error:', message);
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

// 300s — required for PageSpeed API (can take 30-60s) + scrape + AI
export const maxDuration = 300;