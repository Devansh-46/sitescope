// app/api/debug/report/[id]/route.ts
// GET /api/debug/report/:id — shows full report state for debugging stuck pipelines
// DELETE /api/debug/report/:id — force-fails a stuck report so user can retry

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase } = await import('@/lib/supabase');

  const { data, error } = await supabase
    .from('reports')
    .select('id, url, domain, status, error_msg, created_at, overall_score')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Report not found', supabaseError: error?.message }, { status: 404 });
  }

  const ageSeconds = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000);

  return NextResponse.json({
    ...data,
    age_seconds: ageSeconds,
    age_human: ageSeconds > 60 ? `${Math.floor(ageSeconds / 60)}m ${ageSeconds % 60}s` : `${ageSeconds}s`,
    is_stuck: ['PENDING', 'SCRAPING', 'ANALYZING'].includes(data.status) && ageSeconds > 120,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase } = await import('@/lib/supabase');

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'FAILED',
      error_msg: 'Manually force-failed via debug endpoint',
    })
    .eq('id', id)
    .in('status', ['PENDING', 'SCRAPING', 'ANALYZING']); // Only fail if still processing

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Report ${id} force-failed` });
}
