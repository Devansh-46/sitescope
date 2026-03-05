// app/api/pdf/[id]/route.ts
// GET /api/pdf/:id
// Generates and streams a PDF report download

import { NextRequest, NextResponse } from 'next/server';
import { generatePDFReport } from '@/lib/pdf';
import type { AuditReport } from '@/lib/ai';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the report from DB
    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        url: true,
        domain: true,
        auditResult: true,
        status: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'COMPLETE' || !report.auditResult) {
      return NextResponse.json(
        { error: 'Report is not yet complete' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePDFReport(
      report.auditResult as unknown as AuditReport,
      report.url,
      report.domain
    );

    const filename = `sitescope-${report.domain}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Return as a downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[/api/pdf/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
