"use client";

// components/AEOBadge.tsx
import type { AEOReport } from "@/lib/aeo";

interface AEOBadgeProps {
  report: AEOReport;
  size?: "sm" | "md" | "lg";
}

export default function AEOBadge({ report, size = "md" }: AEOBadgeProps) {
  const scoreColor =
    report.overallScore >= 75 ? "#f59e0b"
      : report.overallScore >= 45 ? "#f97316"
        : "#ef4444";

  if (size === "sm") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase"
        style={{
          border: `1px solid ${scoreColor}40`,
          color: scoreColor,
          background: scoreColor + "12",
          letterSpacing: "0.04em",
        }}
        title={`AEO Score: ${report.overallScore}/100 — ${report.aeoReadiness}`}
      >
        🧠 AEO {report.overallScore}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg"
      style={{ background: "#0d0d1a", border: "1px solid #1e1e2e" }}>
      <span className="text-base">🧠</span>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white">AEO {report.overallScore}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: scoreColor + "20", color: scoreColor }}>
            {report.overallGrade}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#4a4a6a" }}>{report.aeoReadiness}</p>
      </div>
    </div>
  );
}