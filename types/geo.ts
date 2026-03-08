// types/geo.ts
// Re-exports all GEO types for convenience — import from here throughout the app

export type {
  GEOSignals,
  GEOCategory,
  GEOFinding,
  GEOReport,
  GEOOpportunity,
} from "@/lib/geo";

// ── Supabase DB type extension ────────────────────────────────────────────────
// In your Reports table type, add:
//   geo_report: import("@/lib/geo").GEOReport | null
//
// Example:
// export interface Database {
//   public: {
//     Tables: {
//       reports: {
//         Row: {
//           id: string;
//           url: string;
//           status: "processing" | "complete" | "error";
//           report_data: Record<string, unknown> | null;
//           aeo_report: import("@/lib/aeo").AEOReport | null;
//           geo_report: import("@/lib/geo").GEOReport | null;  // ✅ NEW
//           created_at: string;
//           completed_at: string | null;
//         };
//       };
//     };
//   };
// }
