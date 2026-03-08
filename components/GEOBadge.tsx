"use client";

// components/GEOBadge.tsx
// Compact GEO score badge for use in ReportHeader or summary cards

import type { GEOReport } from "@/lib/geo";

interface GEOBadgeProps {
  report: GEOReport;
  size?: "sm" | "md" | "lg";
}

export default function GEOBadge({ report, size = "md" }: GEOBadgeProps) {
  const gradeColor = {
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  }[report.overallGrade] ?? "#6b7280";

  const readinessConfig = {
    "AI-Optimized": { icon: "✨", color: "#10b981" },
    "Needs Work": { icon: "⚙️", color: "#f59e0b" },
    "Not Optimized": { icon: "⚠️", color: "#ef4444" },
  }[report.geoReadiness];

  if (size === "sm") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
        style={{
          background: gradeColor + "15",
          border: `1px solid ${gradeColor}30`,
          color: gradeColor,
        }}
        title={`GEO Score: ${report.overallScore}/100 — ${report.geoReadiness}`}
      >
        <span>🌐</span>
        <span>GEO {report.overallScore}</span>
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
          style={{ background: gradeColor + "25" }}
        >
          {report.overallGrade}
        </span>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #0a1628, #111827)",
          border: `1px solid ${gradeColor}25`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
            style={{
              background: gradeColor + "15",
              border: `2px solid ${gradeColor}30`,
            }}
          >
            <span className="text-2xl font-black" style={{ color: gradeColor }}>
              {report.overallScore}
            </span>
            <span className="text-xs font-bold" style={{ color: gradeColor }}>
              GEO
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{readinessConfig.icon}</span>
              <span
                className="text-sm font-bold"
                style={{ color: readinessConfig.color }}
              >
                {report.geoReadiness}
              </span>
            </div>
            <p className="text-xs text-gray-500">Generative Engine Optimization</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-600">AI Mention:</span>
              <span
                className="text-xs font-semibold"
                style={{
                  color:
                    report.aiMentionProbability === "High"
                      ? "#10b981"
                      : report.aiMentionProbability === "Medium"
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              >
                {report.aiMentionProbability} Probability
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: md
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
      style={{
        background: gradeColor + "10",
        border: `1px solid ${gradeColor}25`,
      }}
    >
      <span className="text-base">🌐</span>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white">GEO {report.overallScore}</span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: gradeColor + "20", color: gradeColor }}
          >
            {report.overallGrade}
          </span>
        </div>
        <p className="text-xs" style={{ color: readinessConfig.color }}>
          {readinessConfig.icon} {report.geoReadiness}
        </p>
      </div>
    </div>
  );
}
