// app/api/report/[id]/route.ts  [MODIFIED — returns aeo_report field]
//
// INSTRUCTIONS: In your existing report/[id]/route.ts, update the SELECT
// query to include aeo_report, then pass it through in the response.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
// import { getSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;

    const { data, error } = await supabase
      .from("reports")
      .select(
        // ✅ MODIFIED: add aeo_report to the select list
        "id, url, status, report_data, aeo_report, created_at, completed_at"
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      url: data.url,
      status: data.status,
      report: data.report_data,
      // ✅ NEW: expose aeoReport from Supabase column
      aeoReport: data.aeo_report ?? null,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch report", details: String(error) },
      { status: 500 }
    );
  }
}
