// lib/ai.ts
// Sends scraped data + Lighthouse scores to Claude for AI-powered audit generation
// Returns a strongly-typed AuditReport JSON structure

import Anthropic from '@anthropic-ai/sdk';
import { ScrapedPageData } from './scraper';
import { LighthouseScores } from './lighthouse';

// ============================================================
// Type Definitions — the shape of the AI-generated report
// ============================================================

export interface AuditSection {
  score: number;              // 0–100
  grade: string;              // A, B, C, D, F
  summary: string;            // 1–2 sentence overview
  findings: AuditFinding[];   // Individual observations
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
  topFixes: string[];          // Top 5 prioritized action items
  executiveSummary: string;    // 3–4 sentence exec summary
  generatedAt: string;         // ISO timestamp
}

// ============================================================
// Prompt Template
// ============================================================

/**
 * Builds the audit prompt from scraped data and Lighthouse scores.
 * Designed to produce a JSON-only response with no prose outside JSON.
 */
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

Generate a detailed audit report as a JSON object. Score each section 0–100 based on the data above.

SCORING GUIDE:
- 90–100: Excellent (Grade A)
- 75–89: Good (Grade B)  
- 60–74: Average (Grade C)
- 45–59: Poor (Grade D)
- 0–44: Critical (Grade F)

Return ONLY valid JSON matching this exact structure, with no prose before or after:

{
  "overallScore": <weighted average of all 4 section scores>,
  "grade": "<A/B/C/D/F>",
  "executiveSummary": "<3-4 sentence summary of the site's overall digital health>",
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
    "SEO": {
      "score": <0-100>,
      "grade": "<A/B/C/D/F>",
      "summary": "<1-2 sentence SEO overview>",
      "findings": [...]
    },
    "Performance": {
      "score": <0-100>,
      "grade": "<A/B/C/D/F>",
      "summary": "<1-2 sentence performance overview>",
      "findings": [...]
    },
    "Conversion": {
      "score": <0-100>,
      "grade": "<A/B/C/D/F>",
      "summary": "<1-2 sentence conversion overview>",
      "findings": [...]
    }
  },
  "topFixes": [
    "<Most impactful fix #1>",
    "<Fix #2>",
    "<Fix #3>",
    "<Fix #4>",
    "<Fix #5>"
  ],
  "generatedAt": "${new Date().toISOString()}"
}

Include 4–6 findings per section. Make findings specific and actionable — reference actual data from the input where possible. Prioritize findings by business impact.`;
}

// ============================================================
// Main AI Analysis Function
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Sends scraped page data + Lighthouse scores to Claude and returns
 * a fully structured AuditReport object.
 */
export async function generateAuditReport(
  scraped: ScrapedPageData,
  lighthouse: LighthouseScores
): Promise<AuditReport> {
  const prompt = buildAuditPrompt(scraped, lighthouse);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text content from response
  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  // Strip any accidental markdown code fences
  const cleanJson = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Parse and validate the JSON response
  let report: AuditReport;
  try {
    report = JSON.parse(cleanJson) as AuditReport;
  } catch {
    throw new Error(
      `AI returned invalid JSON. Raw response: ${responseText.slice(0, 500)}`
    );
  }

  // Basic validation
  if (!report.sections || !report.overallScore) {
    throw new Error('AI report is missing required fields');
  }

  return report;
}
