// app/api/report/[id]/route.ts
// GET /api/report/:id
// Returns current report status + data — polled by ProcessingScreen every 5s

import { NextRequest, NextResponse } from 'next/server';

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Report ID is required', 400);
    }

    const { supabase } = await import('@/lib/supabase');

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, url, domain, status, error_msg, overall_score, audit_result, lighthouse_data, aeo_report, geo_report, created_at')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = no rows found
      if (error.code === 'PGRST116') {
        return jsonError('Report not found', 404);
      }
      console.error('[/api/report/[id]] Supabase error:', error);
      return jsonError(`Database error: ${error.message}`);
    }

    if (!report) {
      return jsonError('Report not found', 404);
    }

    return NextResponse.json(report);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    console.error('[/api/report/[id]] Unhandled error:', error);
    return jsonError(message);
  }
}

export const maxDuration = 10;
