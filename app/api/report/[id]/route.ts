// app/api/report/[id]/route.ts
// GET /api/report/:id
// Returns the full report data for a given report ID

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        domain: true,
        overallScore: true,
        status: true,
        errorMsg: true,
        auditResult: true,
        lighthouseData: true,
        createdAt: true,
      },
    });

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
