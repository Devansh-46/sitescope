// lib/pdf.ADDITIONS.ts
// Add these additions to your existing lib/pdf.ts to include AEO in PDF exports
// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS:
//   1. Import AEOReport type at top of pdf.ts
//   2. Add the addAEOSection function below
//   3. Call addAEOSection() from your main generatePDF() function
// ─────────────────────────────────────────────────────────────────────────────

import type { AEOReport } from "./aeo";

// ── Helper: draw a colored rect ──────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

// ── Add AEO Section to jsPDF doc ─────────────────────────────────────────────
export function addAEOSection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any, // jsPDF instance
  aeoReport: AEOReport,
  startY: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let y = startY;

  // ── Section header ──────────────────────────────────────────────────────
  doc.setFillColor(10, 22, 40);
  doc.rect(margin, y, contentWidth, 12, "F");
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("🧠  ANSWER ENGINE OPTIMIZATION (AEO)", margin + 4, y + 8);
  y += 18;

  // ── Score summary row ───────────────────────────────────────────────────
  const gradeColor =
    {
      A: "#10b981",
      B: "#3b82f6",
      C: "#f59e0b",
      D: "#f97316",
      F: "#ef4444",
    }[aeoReport.overallGrade] ?? "#6b7280";

  const rgb = hexToRgb(gradeColor);

  // Score box
  doc.setFillColor(...rgb, 30);
  doc.roundedRect(margin, y, 40, 28, 3, 3, "F");
  doc.setTextColor(...rgb);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(String(aeoReport.overallScore), margin + 10, y + 16);
  doc.setFontSize(8);
  doc.text(`Grade ${aeoReport.overallGrade}`, margin + 5, y + 24);

  // Readiness + Citation
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`AI Readiness: ${aeoReport.aeoReadiness}`, margin + 48, y + 10);
  doc.text(
    `Citation Probability: ${aeoReport.aiCitationProbability}`,
    margin + 48,
    y + 18
  );
  doc.text(
    `Schema Types: ${aeoReport.signals.schemaTypes.length} detected`,
    margin + 48,
    y + 26
  );

  y += 36;

  // ── Summary ─────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  const summaryLines = doc.splitTextToSize(aeoReport.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 8;

  // ── Category scores ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Category Scores", margin, y);
  y += 6;

  const categories = [
    { name: "Structured Data", score: aeoReport.categories.structuredData.score, grade: aeoReport.categories.structuredData.grade },
    { name: "Content Structure", score: aeoReport.categories.contentStructure.score, grade: aeoReport.categories.contentStructure.grade },
    { name: "Authority & Trust", score: aeoReport.categories.authoritySignals.score, grade: aeoReport.categories.authoritySignals.grade },
    { name: "Featured Snippets", score: aeoReport.categories.featuredSnippets.score, grade: aeoReport.categories.featuredSnippets.grade },
    { name: "Conversational", score: aeoReport.categories.conversationalOptimization.score, grade: aeoReport.categories.conversationalOptimization.grade },
  ];

  for (const cat of categories) {
    const catColor =
      {
        A: "#10b981",
        B: "#3b82f6",
        C: "#f59e0b",
        D: "#f97316",
        F: "#ef4444",
      }[cat.grade] ?? "#6b7280";

    const catRgb = hexToRgb(catColor);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(cat.name, margin, y + 4);

    // Score bar background
    doc.setFillColor(30, 30, 40);
    doc.rect(margin + 70, y, contentWidth - 90, 5, "F");

    // Score bar fill
    doc.setFillColor(...catRgb);
    doc.rect(margin + 70, y, ((contentWidth - 90) * cat.score) / 100, 5, "F");

    // Score label
    doc.setTextColor(...catRgb);
    doc.text(`${cat.score} ${cat.grade}`, margin + contentWidth - 16, y + 4);

    y += 10;
  }

  y += 4;

  // ── Top Opportunities ─────────────────────────────────────────────────────
  if (aeoReport.topOpportunities.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("Top AEO Opportunities", margin, y);
    y += 6;

    for (const opp of aeoReport.topOpportunities.slice(0, 4)) {
      const impactColor =
        opp.estimatedImpact === "High"
          ? "#ef4444"
          : opp.estimatedImpact === "Medium"
            ? "#f59e0b"
            : "#6b7280";

      const impRgb = hexToRgb(impactColor);
      doc.setFillColor(...impRgb, 20);
      doc.rect(margin, y - 2, 4, 7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 220, 220);
      doc.text(`${opp.priority}. ${opp.title}`, margin + 7, y + 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `${opp.estimatedImpact} Impact · ${opp.effort} Effort · ${opp.category}`,
        margin + 7,
        y + 9
      );
      y += 15;
    }
  }

  // ── Competitive insight ──────────────────────────────────────────────────
  y += 2;
  doc.setFillColor(15, 25, 45);
  const insightLines = doc.splitTextToSize(
    `💡 ${aeoReport.competitiveInsight}`,
    contentWidth - 8
  );
  doc.rect(margin, y - 2, contentWidth, insightLines.length * 5 + 8, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 149, 237);
  doc.text(insightLines, margin + 4, y + 4);
  y += insightLines.length * 5 + 12;

  return y; // return final Y position for caller to continue
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE in your existing generatePDF function:
//
//   import { addAEOSection } from "./pdf.ADDITIONS";
//
//   // After your existing sections, call:
//   if (aeoReport) {
//     doc.addPage();
//     addAEOSection(doc, aeoReport, 20);
//   }
// ─────────────────────────────────────────────────────────────────────────────
