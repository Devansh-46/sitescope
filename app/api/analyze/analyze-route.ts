// app/api/analyze/route.ts
// POST /api/analyze

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Helper — always returns JSON, never lets an error bubble into an HTML response
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

export async function POST(request: NextRequest) {
  let reportId: string | null = null;

  try {
    // ── 1. Parse body ──────────────────────────────────────────
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

    // ── 2. Lazy-import everything (avoids module-load crashes) ──
    const { supabase } = await import('@/lib/supabase-client');
    const { scrapePage } = await import('@/lib/scraper');
    const { runLighthouse } = await import('@/lib/lighthouse');
    const { generateAuditReport } = await import('@/lib/ai');

    // ── 3. Create pending report ────────────────────────────────
    const { data: report, error: createError } = await supabase
      .from('reports')
      .insert({ url, domain, status: 'PENDING' })
      .select('id')
      .single();

    if (createError || !report) {
      console.error('[analyze] DB insert error:', createError);
      return jsonError(`Database error: ${createError?.message ?? 'Could not create report'}`);
    }
    reportId = report.id;

    // ── 4. Scrape ────────────────────────────────────────────────
    await supabase.from('reports').update({ status: 'SCRAPING' }).eq('id', reportId);

    let scrapedData;
    try {
      scrapedData = await scrapePage(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scraping failed';
      await supabase.from('reports').update({ status: 'FAILED', error_msg: msg }).eq('id', reportId);
      return jsonError(msg);
    }

    await supabase.from('reports').update({ scraped_data: scrapedData }).eq('id', reportId);

    // ── 5. Lighthouse ────────────────────────────────────────────
    const lighthouseData = await runLighthouse(url); // never throws — has fallback
    await supabase.from('reports').update({ lighthouse_data: lighthouseData }).eq('id', reportId);

    // ── 6. AI audit ──────────────────────────────────────────────
    await supabase.from('reports').update({ status: 'ANALYZING' }).eq('id', reportId);

    let auditResult;
    try {
      auditResult = await generateAuditReport(scrapedData, lighthouseData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed';
      await supabase.from('reports').update({ status: 'FAILED', error_msg: msg }).eq('id', reportId);
      return jsonError(msg);
    }

    // ── 7. Save & return ─────────────────────────────────────────
    await supabase.from('reports').update({
      audit_result: auditResult,
      overall_score: auditResult.overallScore,
      status: 'COMPLETE',
    }).eq('id', reportId);

    return NextResponse.json(
      { reportId, status: 'complete', overallScore: auditResult.overallScore },
      { status: 200 }
    );

  } catch (error) {
    // Last-resort catch — ensures we ALWAYS return JSON
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    console.error('[/api/analyze] Unhandled error:', error);

    if (reportId) {
      try {
        const { supabase } = await import('@/lib/supabase-client');
        await supabase.from('reports').update({ status: 'FAILED', error_msg: message }).eq('id', reportId);
      } catch { }
    }

    return jsonError(message);
  }
}

export const maxDuration = 60;
