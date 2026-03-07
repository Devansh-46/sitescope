// types/aeo.ts
// Re-exports all AEO types for convenience — import from here throughout the app

export type {
  AEOSignals,
  AEOCategory,
  AEOFinding,
  AEOReport,
  AEOOpportunity,
} from "@/lib/aeo";

// ── Supabase DB type extension ────────────────────────────────────────────────
// Add this to your existing database types (types/database.ts or similar)
//
// In your Reports table type, add:
//   aeo_report: import("@/lib/aeo").AEOReport | null
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
//           aeo_report: import("@/lib/aeo").AEOReport | null;  // ✅ NEW
//           created_at: string;
//           completed_at: string | null;
//         };
//         Insert: { ... };
//         Update: { ... };
//       };
//     };
//   };
// }
