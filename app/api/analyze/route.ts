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
  const { runLighthouse } = await import('@/lib/pagespeed');
  const { generateAuditReport } = await import('@/lib/ai');

  // Hard timeout — kill the pipeline after 55 seconds (just under Vercel's 60s limit)
  const pipelineTimeout = setTimeout(async () => {
    console.error('[pipeline] Timed out after 55 seconds');
    try {
      await supabase.from('reports').update({
        status: 'FAILED',
        error_msg: 'Analysis timed out. The website may be slow or blocking automated access. Please try again.',
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
      await supabase.from('reports').update({ status: 'FAILED', error_msg: `Scraping failed: ${msg}` }).eq('id', reportId);
      clearTimeout(pipelineTimeout);
      return;
    }

    await supabase.from('reports').update({ scraped_data: scrapedData }).eq('id', reportId);

    // 2. Lighthouse (never throws — has fallback)
    console.log('[pipeline] Starting PageSpeed Insights...');
    const lighthouseData = await runLighthouse(url);
    console.log('[pipeline] PageSpeed complete. Performance:', lighthouseData.performance);
    await supabase.from('reports').update({ lighthouse_data: lighthouseData }).eq('id', reportId);

    // 3. AI audit
    console.log('[pipeline] Starting Gemini AI analysis...');
    await supabase.from('reports').update({ status: 'ANALYZING' }).eq('id', reportId);

    let auditResult;
    try {
      auditResult = await generateAuditReport(scrapedData, lighthouseData);
      console.log('[pipeline] AI analysis complete. Score:', auditResult.overallScore);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed';
      console.error('[pipeline] AI failed:', msg);
      await supabase.from('reports').update({ status: 'FAILED', error_msg: `AI analysis failed: ${msg}` }).eq('id', reportId);
      clearTimeout(pipelineTimeout);
      return;
    }

    // 4. Mark complete
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
      await supabase.from('reports').update({ status: 'FAILED', error_msg: message }).eq('id', reportId);
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

    // Create pending report immediately
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

    // after() keeps the Vercel serverless function alive until the pipeline finishes
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
