// app/api/analyze/route.ts  [MODIFIED — add AEO to the pipeline]
// Diff-style: shows only the additions needed. Search for ✅ NEW comments.

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS: Merge these additions into your existing analyze/route.ts
//
// 1. Add the AEO imports at the top
// 2. After scraping but before or after Gemini call, run AEO analysis
// 3. Save aeoReport into Supabase alongside the rest of the report data
// 4. Return aeoReport in the response JSON
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
// ✅ NEW: Import AEO utilities
import { extractAEOSignals, buildAEOReport } from "@/lib/aeo";

// ─── Your existing imports below (keep them) ─────────────────────────────────
// import { scrapeUrl } from "@/lib/scraper";
// import { generateAuditReport } from "@/lib/ai";
// import { getSupabaseClient } from "@/lib/supabase";
// import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // ── 1. Create report record in Supabase ──────────────────────────────────
    // (your existing code)
    const supabase = getSupabaseClient();
    const reportId = uuidv4();

    await supabase.from("reports").insert({
      id: reportId,
      url,
      status: "processing",
      created_at: new Date().toISOString(),
    });

    // ── 2. Scrape the URL ────────────────────────────────────────────────────
    // (your existing code)
    const { html, signals: scraperSignals } = await scrapeUrl(url);

    // ✅ NEW: 3. Run AEO Analysis (non-blocking, fast — pure JS, no API calls)
    let aeoReport = null;
    try {
      const aeoSignals = extractAEOSignals(html, url);
      aeoReport = buildAEOReport(aeoSignals, url);
    } catch (aeoError) {
      console.warn("[AEO] Analysis failed (non-fatal):", aeoError);
    }

    // ── 4. Generate AI Audit (your existing Gemini call) ────────────────────
    const aiReport = await generateAuditReport(url, scraperSignals);

    // ── 5. Save everything to Supabase ──────────────────────────────────────
    await supabase
      .from("reports")
      .update({
        status: "complete",
        report_data: aiReport,
        // ✅ NEW: save AEO alongside existing report data
        aeo_report: aeoReport,
        completed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // ── 6. Return response ──────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      reportId,
      report: aiReport,
      // ✅ NEW: include AEO in response
      aeoReport,
    });

  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
