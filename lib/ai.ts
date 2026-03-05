// lib/ai.ts
// Sends scraped data + Lighthouse scores to Gemini for AI-powered audit generation
// Returns a strongly-typed AuditReport JSON structure

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedPageData } from './scraper';
import { LighthouseScores } from './lighthouse';

// ============================================================
// Type Definitions — the shape of the AI-generated report
// ============================================================

export interface AuditSection {
  score: number;
  grade: string;
  summary: string;
  findings: AuditFinding[];
}

export interface AuditFinding {
  type: 'critical' | 'warning' | 'info' | 'good';
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AuditReport {
  overallScore: number;
  grade: string;
  sections: {
    UX: AuditSection;
    SEO: AuditSection;
    Performance: AuditSection;
    Conversion: AuditSection;
  };
  topFixes: string[];
  executiveSummary: string;
  generatedAt: string;
}

// ============================================================
// Prompt Template
// ============================================================

function buildAuditPrompt(
  scraped: ScrapedPageData,
  lighthouse: LighthouseScores
): string {
  return `You are a senior digital strategist and technical SEO expert. Analyze the following website data and generate a comprehensive audit report.

WEBSITE DATA:
URL: ${scraped.finalUrl}
Page Title: "${scraped.title}"
Meta Description: "${scraped.metaDescription || 'MISSING'}"
Meta Keywords: "${scraped.metaKeywords || 'None'}"
OG Title: "${scraped.ogTitle || 'MISSING'}"
OG Description: "${scraped.ogDescription || 'MISSING'}"

HEADING STRUCTURE:
H1 Tags (${scraped.h1Tags.length}): ${JSON.stringify(scraped.h1Tags.slice(0, 5))}
H2 Tags (${scraped.h2Tags.length}): ${JSON.stringify(scraped.h2Tags.slice(0, 8))}
H3 Tags (${scraped.h3Tags.length}): ${JSON.stringify(scraped.h3Tags.slice(0, 8))}

CONTENT & LINKS:
Word Count: ${scraped.wordCount}
Internal Links: ${scraped.internalLinks.length}
External Links: ${scraped.externalLinks.length}
Total Images: ${scraped.imagesTotal}
Images Missing Alt Text: ${scraped.imagesMissingAlt}

TECHNICAL SEO:
Has Canonical Tag: ${scraped.hasCanonical} ${scraped.canonicalUrl ? `(${scraped.canonicalUrl})` : ''}
Has Viewport Meta: ${scraped.hasViewport}
Has Structured Data (JSON-LD): ${scraped.hasStructuredData}
Robots Meta: ${scraped.hasRobotsMeta ? scraped.robotsContent : 'Not set'}

CONVERSION SIGNALS:
CTA Buttons Found: ${JSON.stringify(scraped.ctaButtons)}
Forms on Page: ${scraped.formCount}
Page Load Time: ${scraped.pageLoadTime}ms

LIGHTHOUSE SCORES:
Performance: ${lighthouse.performance}/100
Accessibility: ${lighthouse.accessibility}/100
Best Practices: ${lighthouse.bestPractices}/100
SEO: ${lighthouse.seo}/100

KEY METRICS:
First Contentful Paint: ${lighthouse.firstContentfulPaint}
Largest Contentful Paint: ${lighthouse.largestContentfulPaint}
Total Blocking Time: ${lighthouse.totalBlockingTime}
Cumulative Layout Shift: ${lighthouse.cumulativeLayoutShift}
Speed Index: ${lighthouse.speedIndex}
Time to Interactive: ${lighthouse.timeToInteractive}

TOP PERFORMANCE OPPORTUNITIES:
${lighthouse.opportunities.map((o) => `- ${o.title}: ${o.savings}`).join('\n') || 'None identified'}

DIAGNOSTICS:
${lighthouse.diagnostics.join('\n') || 'None'}

---

Generate a detailed audit report as a JSON object. Score each section 0-100 based on the data above.

SCORING GUIDE:
- 90-100: Excellent (Grade A)
- 75-89: Good (Grade B)
- 60-74: Average (Grade C)
- 45-59: Poor (Grade D)
- 0-44: Critical (Grade F)

Return ONLY valid JSON matching this exact structure, with no prose before or after:

{
  "overallScore": <weighted average of all 4 section scores>,
  "grade": "<A/B/C/D/F>",
  "executiveSummary": "<3-4 sentence summary of the site overall digital health>",
  "sections": {
    "UX": {
      "score": <0-100>,
      "grade": "<A/B/C/D/F>",
      "summary": "<1-2 sentence UX overview>",
      "findings": [
        {
          "type": "<critical|warning|info|good>",
          "title": "<short finding title>",
          "detail": "<actionable detail explaining the issue and how to fix it>",
          "impact": "<high|medium|low>"
        }
      ]
    },
    "SEO": { "score": <0-100>, "grade": "<A/B/C/D/F>", "summary": "<overview>", "findings": [...] },
    "Performance": { "score": <0-100>, "grade": "<A/B/C/D/F>", "summary": "<overview>", "findings": [...] },
    "Conversion": { "score": <0-100>, "grade": "<A/B/C/D/F>", "summary": "<overview>", "findings": [...] }
  },
  "topFixes": ["<Fix #1>", "<Fix #2>", "<Fix #3>", "<Fix #4>", "<Fix #5>"],
  "generatedAt": "${new Date().toISOString()}"
}

Include 4-6 findings per section. Make findings specific and actionable. Prioritize by business impact.`;
}

// ============================================================
// Main AI Analysis Function
// ============================================================

export async function generateAuditReport(
  scraped: ScrapedPageData,
  lighthouse: LighthouseScores
): Promise<AuditReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  });

  const prompt = buildAuditPrompt(scraped, lighthouse);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const cleanJson = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Attempt to recover truncated JSON by closing open structures
  let jsonToParse = cleanJson;
  if (!cleanJson.endsWith('}')) {
    // Find the last complete top-level field and close the object
    const lastBrace = cleanJson.lastIndexOf('}');
    jsonToParse = lastBrace > 0 ? cleanJson.slice(0, lastBrace + 1) : cleanJson;
  }

  let report: AuditReport;
  try {
    report = JSON.parse(jsonToParse) as AuditReport;
  } catch {
    throw new Error(
      `AI returned invalid JSON. Raw response: ${responseText.slice(0, 500)}`
    );
  }

  if (!report.sections || !report.overallScore) {
    throw new Error('AI report is missing required fields');
  }

  return report;
}