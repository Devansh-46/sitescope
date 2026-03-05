// app/api/analyze/route.ts
// POST /api/analyze
// Creates report instantly → returns reportId → background processing begins

import { NextRequest, NextResponse } from 'next/server';
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

// ── Background pipeline (runs after response is sent) ────────
async function runAnalysisPipeline(reportId: string, url: string) {
  const { supabase } = await import('@/lib/supabase');
  const { scrapePage } = await import('@/lib/scraper');
  const { runLighthouse } = await import('@/lib/lighthouse');
  const { generateAuditReport } = await import('@/lib/ai');

  try {
    // 1. Scrape
    await supabase.from('reports').update({ status: 'SCRAPING' }).eq('id', reportId);

    let scrapedData;
    try {
      scrapedData = await scrapePage(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scraping failed';
      await supabase.from('reports').update({ status: 'FAILED', error_msg: msg }).eq('id', reportId);
      return;
    }

    await supabase.from('reports').update({ scraped_data: scrapedData }).eq('id', reportId);

    // 2. Lighthouse (never throws — has fallback)
    const lighthouseData = await runLighthouse(url);
    await supabase.from('reports').update({ lighthouse_data: lighthouseData }).eq('id', reportId);

    // 3. AI audit
    await supabase.from('reports').update({ status: 'ANALYZING' }).eq('id', reportId);

    let auditResult;
    try {
      auditResult = await generateAuditReport(scrapedData, lighthouseData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed';
      await supabase.from('reports').update({ status: 'FAILED', error_msg: msg }).eq('id', reportId);
      return;
    }

    // 4. Mark complete
    await supabase.from('reports').update({
      audit_result: auditResult,
      overall_score: auditResult.overallScore,
      status: 'COMPLETE',
    }).eq('id', reportId);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[pipeline] Unhandled error:', error);
    try {
      const { supabase: sb } = await import('@/lib/supabase');
      await sb.from('reports').update({ status: 'FAILED', error_msg: message }).eq('id', reportId);
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

    // Fire-and-forget — pipeline runs after response is returned
    runAnalysisPipeline(report.id, url).catch(err =>
      console.error('[analyze] Pipeline uncaught:', err)
    );

    // Return reportId instantly — client redirects to /report/[id]
    // ProcessingScreen polls every 5s until status = COMPLETE
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