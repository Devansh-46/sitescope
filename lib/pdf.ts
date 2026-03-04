// lib/pdf.ts
// Generates a downloadable PDF report from the audit data
// Uses jsPDF + jspdf-autotable for professional formatting
// Runs server-side only

import type { AuditReport } from './ai';

/**
 * Generates a PDF buffer from an AuditReport.
 * Returns a Buffer that can be streamed as a download.
 */
export async function generatePDFReport(
  report: AuditReport,
  url: string,
  domain: string
): Promise<Buffer> {
  // Dynamic import — jsPDF works both client and server
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Helper functions ──────────────────────────────────────

  const addSection = (title: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(0, 212, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 8;
  };

  const scoreColor = (score: number): [number, number, number] => {
    if (score >= 90) return [0, 200, 100];
    if (score >= 75) return [80, 180, 255];
    if (score >= 60) return [255, 180, 0];
    if (score >= 45) return [255, 120, 0];
    return [255, 50, 80];
  };

  // ── Cover Page ─────────────────────────────────────────────

  // Header background
  doc.setFillColor(8, 13, 20);
  doc.rect(0, 0, pageW, 60, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 212, 255);
  doc.text('SiteScope', margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(122, 154, 184);
  doc.text('AI-Powered Website Audit Report', margin, 35);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })}`, margin, 43);
  doc.text(`URL: ${url}`, margin, 51);

  y = 75;

  // ── Overall Score ──────────────────────────────────────────

  const [r, g, b] = scoreColor(report.overallScore);
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(r, g, b);
  doc.text(`${report.overallScore}`, margin, y + 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('/100 Overall Score', margin + 30, y + 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grade: ${report.grade}`, margin + 30, y + 20);

  y += 35;

  // ── Executive Summary ──────────────────────────────────────

  addSection('Executive Summary');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(report.executiveSummary, contentW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  // ── Category Scores Table ──────────────────────────────────

  addSection('Category Scores');

  const scoreRows = Object.entries(report.sections).map(([name, section]) => {
    const [sr, sg, sb] = scoreColor(section.score);
    return [name, `${section.score}/100`, section.grade, section.summary];
  });

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Score', 'Grade', 'Summary']],
    body: scoreRows,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [8, 13, 20], textColor: [0, 212, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 20 },
      2: { cellWidth: 15 },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const score = parseInt(data.cell.raw as string);
        const [cr, cg, cb] = scoreColor(score);
        data.cell.styles.textColor = [cr, cg, cb];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // ── Top Fixes ──────────────────────────────────────────────

  if (y > 240) { doc.addPage(); y = margin; }
  addSection('🔧 Top Priority Fixes');

  report.topFixes.forEach((fix, i) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 80, 80);
    doc.text(`${i + 1}.`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(fix, contentW - 8);
    doc.text(lines, margin + 8, y);
    y += lines.length * 5 + 3;
  });

  y += 10;

  // ── Detailed Findings (one page per section) ───────────────

  for (const [sectionName, section] of Object.entries(report.sections)) {
    if (y > 200) { doc.addPage(); y = margin; }

    addSection(`${sectionName} Analysis — ${section.score}/100 (${section.grade})`);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const summLines = doc.splitTextToSize(section.summary, contentW);
    doc.text(summLines, margin, y);
    y += summLines.length * 5 + 8;

    const findingRows = section.findings.map((f) => [
      f.type.toUpperCase(),
      f.title,
      f.detail,
      f.impact.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Type', 'Finding', 'Detail', 'Impact']],
      body: findingRows,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 40, 55], textColor: [200, 220, 240] },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 90 },
        3: { cellWidth: 18 },
      },
      bodyStyles: { fontSize: 8.5 },
      didParseCell: (data) => {
        if (data.column.index === 0 && data.section === 'body') {
          const raw = (data.cell.raw as string).toLowerCase();
          if (raw === 'critical') data.cell.styles.textColor = [220, 50, 80];
          else if (raw === 'warning') data.cell.styles.textColor = [255, 160, 0];
          else if (raw === 'good') data.cell.styles.textColor = [0, 180, 80];
          else data.cell.styles.textColor = [80, 140, 200];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 15;
  }

  // ── Footer on every page ───────────────────────────────────

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SiteScope — ${domain} — Page ${i} of ${totalPages}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
