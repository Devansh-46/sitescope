// app/api/report/[id]/route.ts
// GET /api/report/:id
// Returns the full report data for a given report ID

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const { supabase } = await import('@/lib/supabase');

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, url, domain, overall_score, status, error_msg, audit_result, lighthouse_data, created_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[/api/report/[id]] Supabase error:', error.code, error.message);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('[/api/report/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}