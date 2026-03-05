// app/api/pdf/[id]/route.ts
// GET /api/pdf/:id
// Generates and streams a PDF report download

import { NextRequest, NextResponse } from 'next/server';
import { generatePDFReport } from '@/lib/pdf';
import type { AuditReport } from '@/lib/ai';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('reports')
      .select('url, domain, audit_result, status')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (data.status !== 'COMPLETE' || !data.audit_result) {
      return NextResponse.json({ error: 'Report not complete' }, { status: 400 });
    }

    const pdfBuffer = await generatePDFReport(
      data.audit_result as unknown as AuditReport,
      data.url,
      data.domain
    );

    const filename = `sitescope-${data.domain}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Convert Buffer → Uint8Array (required by Next.js 15 / Web Streams API)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[/api/pdf/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}