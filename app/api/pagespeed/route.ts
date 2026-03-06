// app/api/pagespeed/route.ts
// POST /api/pagespeed
// Runs Google PageSpeed Insights for a URL (mobile + desktop) and returns the full report.
// Can be called standalone — does NOT require a report to exist in Supabase.
//
// Body: { url: string, saveToReport?: string }  ← saveToReport is an optional reportId

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPageSpeed } from '@/lib/pagespeed';

const Schema = z.object({
  url: z.string().url('Please provide a valid URL'),
  saveToReport: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { url, saveToReport } = parsed.data;

    console.log('[/api/pagespeed] Fetching for:', url);
    const report = await runPageSpeed(url);

    // Optionally persist to an existing report row
    if (saveToReport) {
      try {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('reports')
          .update({ lighthouse_data: report.desktop }) // store desktop result for backwards compat
          .eq('id', saveToReport);
        console.log('[/api/pagespeed] Saved to report', saveToReport);
      } catch (e) {
        console.warn('[/api/pagespeed] Could not save to report:', e);
        // Non-fatal — still return the data
      }
    }

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[/api/pagespeed]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/pagespeed?url=https://example.com  — convenient browser-testable version
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Pass ?url=https://yoursite.com' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const report = await runPageSpeed(url);
  return NextResponse.json(report);
}

export const maxDuration = 300; // PageSpeed API can take up to 90s per strategy × 2
