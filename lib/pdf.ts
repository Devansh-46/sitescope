// lib/pdf.ts
// Generates a downloadable PDF report from the audit data
// Uses jsPDF + jspdf-autotable for professional formatting
// Runs server-side only

import type { AuditReport } from './ai';
import type { AEOReport } from './aeo';
import type { GEOReport } from './geo';

/**
 * Generates a PDF buffer from an AuditReport (+ optional AEOReport).
 * Returns a Buffer that can be streamed as a download.
 */
export async function generatePDFReport(
  report: AuditReport,
  url: string,
  domain: string,
  aeoReport?: AEOReport | null,
  geoReport?: GEOReport | null
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
  const pageH = doc.internal.pageSize.getHeight();
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

  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16),
    ];
  };

  // ── Cover Page ─────────────────────────────────────────────

  // Header background
  doc.setFillColor(8, 13, 20);
  doc.rect(0, 0, pageW, 60, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 212, 255);
  doc.text('SiteScope', margin, 25);
  doc.setFontSize(14);
  doc.text('by Plain & Pixel', margin + 48, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(122, 154, 184);
  doc.text('AI-Powered Website Audit Report', margin, 35);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })}`, margin, 43);
  doc.text(`URL: ${url}`, margin, 49);
  doc.text(`Developed by: Plain & Pixel (https://plainnpixel.tech)`, margin, 55);

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

  // ── AEO Section (if available) ────────────────────────────
  if (aeoReport) {
    doc.addPage();
    y = margin;

    // AEO Header
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ANSWER ENGINE OPTIMIZATION (AEO)', margin, 9);
    y = 22;

    // Score + readiness row
    const gradeColorHex = {
      A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444',
    }[aeoReport.overallGrade] ?? '#6b7280';
    const [ar, ag, ab] = hexToRgb(gradeColorHex);

    doc.setFillColor(ar, ag, ab);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ar, ag, ab);
    doc.text(String(aeoReport.overallScore), margin, y + 14);
    doc.setFontSize(10);
    doc.text(`Grade ${aeoReport.overallGrade}`, margin + 18, y + 14);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`AI Readiness: ${aeoReport.aeoReadiness}`, margin + 50, y + 6);
    doc.text(`Citation Probability: ${aeoReport.aiCitationProbability}`, margin + 50, y + 13);
    doc.text(`Schema Types Detected: ${aeoReport.signals.schemaTypes.length}`, margin + 50, y + 20);
    y += 32;

    // Summary
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(90, 90, 90);
    const aeoSummLines = doc.splitTextToSize(aeoReport.summary, contentW);
    doc.text(aeoSummLines, margin, y);
    y += aeoSummLines.length * 5 + 10;

    // Category scores
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Category Scores', margin, y);
    y += 8;

    const aeoCategories = [
      { name: 'Structured Data', score: aeoReport.categories.structuredData.score, grade: aeoReport.categories.structuredData.grade },
      { name: 'Content Structure', score: aeoReport.categories.contentStructure.score, grade: aeoReport.categories.contentStructure.grade },
      { name: 'Authority & Trust', score: aeoReport.categories.authoritySignals.score, grade: aeoReport.categories.authoritySignals.grade },
      { name: 'Featured Snippets', score: aeoReport.categories.featuredSnippets.score, grade: aeoReport.categories.featuredSnippets.grade },
      { name: 'Conversational', score: aeoReport.categories.conversationalOptimization.score, grade: aeoReport.categories.conversationalOptimization.grade },
    ];

    for (const cat of aeoCategories) {
      const catHex = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[cat.grade] ?? '#6b7280';
      const [cr, cg, cb] = hexToRgb(catHex);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text(cat.name, margin, y + 4);

      // Bar background
      doc.setFillColor(220, 220, 230);
      doc.rect(margin + 52, y, contentW - 66, 4, 'F');

      // Bar fill
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin + 52, y, ((contentW - 66) * cat.score) / 100, 4, 'F');

      // Score label
      doc.setTextColor(cr, cg, cb);
      doc.setFont('helvetica', 'bold');
      doc.text(`${cat.score}  ${cat.grade}`, margin + contentW - 12, y + 4);

      y += 9;
    }

    y += 6;

    // Top opportunities
    if (aeoReport.topOpportunities.length > 0) {
      if (y > 220) { doc.addPage(); y = margin; }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Top AEO Opportunities', margin, y);
      y += 8;

      for (const opp of aeoReport.topOpportunities.slice(0, 5)) {
        const impHex = opp.estimatedImpact === 'High' ? '#ef4444' : opp.estimatedImpact === 'Medium' ? '#f59e0b' : '#6b7280';
        const [ir, ig, ib] = hexToRgb(impHex);

        doc.setFillColor(ir, ig, ib);
        doc.rect(margin, y - 1, 3, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(`${opp.priority}. ${opp.title}`, margin + 6, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`${opp.estimatedImpact} Impact · ${opp.effort} Effort · ${opp.category}`, margin + 6, y + 9);
        y += 15;
      }
    }

    // Competitive insight
    y += 4;
    doc.setFillColor(240, 245, 255);
    const insightLines = doc.splitTextToSize(`Competitive Insight: ${aeoReport.competitiveInsight}`, contentW - 8);
    doc.rect(margin, y - 2, contentW, insightLines.length * 5 + 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(59, 100, 180);
    doc.text(insightLines, margin + 4, y + 4);
    y += insightLines.length * 5 + 12;
  }

  // ── GEO Section (if available) ────────────────────────────
  if (geoReport) {
    doc.addPage();
    y = margin;

    // GEO Header
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('GENERATIVE ENGINE OPTIMIZATION (GEO)', margin, 9);
    doc.text('How AI Models Represent Your Brand', pageW - margin - 2, 9, { align: 'right' });
    y = 30;

    const gradeColorGeo = {
      A: [16, 185, 129],
      B: [59, 130, 246],
      C: [245, 158, 11],
      D: [249, 115, 22],
      F: [239, 68, 68],
    }[geoReport.overallGrade] ?? [107, 114, 128];

    doc.setFillColor(...(gradeColorGeo as [number, number, number]));
    doc.roundedRect(margin, y, 40, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(geoReport.overallScore), margin, y + 14);
    doc.setFontSize(9);
    doc.text(`Grade ${geoReport.overallGrade}`, margin + 18, y + 14);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`GEO Readiness: ${geoReport.geoReadiness}`, margin + 50, y + 6);
    doc.text(`AI Mention Probability: ${geoReport.aiMentionProbability}`, margin + 50, y + 13);
    doc.text(`Social Profiles Linked: ${geoReport.signals.socialProfilesCount}`, margin + 50, y + 20);
    y += 35;

    // Simulated AI brand summary
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 60, 120);
    doc.setFillColor(245, 240, 255);
    const brandSummLines = doc.splitTextToSize(`"${geoReport.brandSummary}"`, contentW - 8);
    doc.rect(margin, y - 2, contentW, brandSummLines.length * 5 + 8, 'F');
    doc.text(brandSummLines, margin + 4, y + 4);
    y += brandSummLines.length * 5 + 12;

    // Summary text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const geoSummLines = doc.splitTextToSize(geoReport.summary, contentW);
    doc.text(geoSummLines, margin, y);
    y += geoSummLines.length * 5 + 10;

    // Category scores
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('Category Scores', margin, y);
    y += 7;

    const geoCategories = [
      { name: 'Brand Identity', score: geoReport.categories.brandIdentity.score, grade: geoReport.categories.brandIdentity.grade },
      { name: 'Trust & Authority', score: geoReport.categories.trustAuthority.score, grade: geoReport.categories.trustAuthority.grade },
      { name: 'Knowledge Panel', score: geoReport.categories.knowledgePanel.score, grade: geoReport.categories.knowledgePanel.grade },
      { name: 'AI Discoverability', score: geoReport.categories.aiDiscoverability.score, grade: geoReport.categories.aiDiscoverability.grade },
      { name: 'Citation Worthiness', score: geoReport.categories.citationWorthiness.score, grade: geoReport.categories.citationWorthiness.grade },
    ];

    for (const cat of geoCategories) {
      const gc = { A: [16, 185, 129], B: [59, 130, 246], C: [245, 158, 11], D: [249, 115, 22], F: [239, 68, 68] }[cat.grade] ?? [107, 114, 128];
      const barW = (cat.score / 100) * (contentW - 60);
      doc.setFillColor(230, 230, 240);
      doc.rect(margin + 60, y - 3, contentW - 60, 6, 'F');
      doc.setFillColor(...(gc as [number, number, number]));
      doc.rect(margin + 60, y - 3, barW, 6, 'F');
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(cat.name, margin, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${cat.score} (${cat.grade})`, pageW - margin, y + 1, { align: 'right' });
      y += 10;
    }
    y += 5;

    // Top GEO Opportunities
    if (geoReport.topOpportunities.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text('Top GEO Opportunities', margin, y);
      y += 7;

      for (const opp of geoReport.topOpportunities.slice(0, 5)) {
        const impColor = { High: [239, 68, 68], Medium: [245, 158, 11], Low: [107, 114, 128] }[opp.estimatedImpact] as [number, number, number];
        doc.setFillColor(248, 248, 252);
        doc.rect(margin, y - 2, contentW, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        doc.text(`${opp.priority}. ${opp.title}`, margin + 2, y + 4);
        doc.setFillColor(...impColor);
        doc.roundedRect(pageW - margin - 28, y, 28, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`${opp.estimatedImpact} Impact`, pageW - margin - 27, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(opp.description, contentW - 35);
        doc.text(descLines[0], margin + 2, y + 10);
        y += 16;
        if (y > pageH - 30) { doc.addPage(); y = margin; }
      }
      y += 5;
    }

    // Competitive insight
    y += 4;
    doc.setFillColor(245, 240, 255);
    const geoInsightLines = doc.splitTextToSize(`Competitive Insight: ${geoReport.competitiveInsight}`, contentW - 8);
    doc.rect(margin, y - 2, contentW, geoInsightLines.length * 5 + 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 60, 180);
    doc.text(geoInsightLines, margin + 4, y + 4);
    y += geoInsightLines.length * 5 + 12;
  }

  // ── Footer on every page ───────────────────────────────────

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SiteScope by Plain & Pixel — ${domain} — Page ${i} of ${totalPages}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}