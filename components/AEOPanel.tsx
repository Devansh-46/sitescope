"use client";

// components/AEOPanel.tsx
// Answer Engine Optimization Panel for SiteScope Report

import { useState, useEffect, useRef } from "react";
import type { AEOReport, AEOCategory, AEOFinding } from "@/lib/aeo";

interface AEOPanelProps {
  url: string;
  initialReport?: AEOReport | null;
}

// ─── Animated Score Ring ────────────────────────────────────────────────────
function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  grade,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  grade: string;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1200;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.round(eased * score));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const gradeColor = {
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  }[grade] ?? "#6b7280";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{animatedScore}</span>
        <span className="text-xs font-semibold" style={{ color: gradeColor }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

// ─── Mini Score Bar ─────────────────────────────────────────────────────────
function ScoreBar({ score, label }: { score: number; label: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 75
      ? "#10b981"
      : score >= 60
        ? "#3b82f6"
        : score >= 45
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Finding Row ─────────────────────────────────────────────────────────────
function FindingRow({ finding }: { finding: AEOFinding }) {
  const config = {
    pass: { icon: "✓", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
    fail: { icon: "✗", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
    warning: { icon: "!", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  }[finding.type];

  const impactBadge = {
    high: { label: "High Impact", color: "#ef4444" },
    medium: { label: "Medium", color: "#f59e0b" },
    low: { label: "Low", color: "#6b7280" },
  }[finding.impact];

  return (
    <div
      className="rounded-lg p-3 mb-2"
      style={{ background: config.bg, border: `1px solid ${config.color}22` }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: config.color + "22", color: config.color }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{finding.title}</p>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                background: impactBadge.color + "20",
                color: impactBadge.color,
              }}
            >
              {impactBadge.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {finding.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────
function CategorySection({ category }: { category: AEOCategory }) {
  const [expanded, setExpanded] = useState(false);

  const gradeColor = {
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  }[category.grade] ?? "#6b7280";

  const failCount = category.findings.filter((f) => f.type === "fail").length;
  const passCount = category.findings.filter((f) => f.type === "pass").length;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid #ffffff10", background: "#111827" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
      >
        {/* Score circle */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex flex-col items-center justify-center"
          style={{
            background: gradeColor + "15",
            border: `2px solid ${gradeColor}40`,
          }}
        >
          <span className="text-sm font-bold" style={{ color: gradeColor }}>
            {category.score}
          </span>
        </div>

        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">{category.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {passCount} passed · {failCount} failed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-1 rounded"
            style={{ background: gradeColor + "20", color: gradeColor }}
          >
            Grade {category.grade}
          </span>
          <svg
            className="w-4 h-4 text-gray-600 transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <div className="space-y-1">
            {category.findings.map((finding, i) => (
              <FindingRow key={i} finding={finding} />
            ))}
          </div>

          {category.opportunities.length > 0 && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: "#1f2937" }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Opportunities
              </p>
              <ul className="space-y-1.5">
                {category.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main AEO Panel ──────────────────────────────────────────────────────────
export default function AEOPanel({ url, initialReport }: AEOPanelProps) {
  const [report, setReport] = useState<AEOReport | null>(initialReport ?? null);
  const [loading, setLoading] = useState(!initialReport);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "opportunities">("overview");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (initialReport || hasFetched.current) return;
    hasFetched.current = true;

    const fetchAEO = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/aeo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error(`AEO analysis failed (${res.status})`);
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAEO();
  }, [url, initialReport]);

  // ── Loading state ──
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
          border: "1px solid #1e3a5f",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 animate-pulse" />
          <div>
            <div className="h-4 w-48 bg-white/10 rounded mb-1.5" />
            <div className="h-3 w-32 bg-white/5 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded-full border-2 border-blue-500/40 border-t-blue-400 animate-spin" />
          Analyzing AEO signals...
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !report) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#0f172a",
          border: "1px solid #ef444430",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "#ef444415" }}
          >
            ⚡
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AEO Analysis</p>
            <p className="text-xs text-gray-500">Answer Engine Optimization</p>
          </div>
        </div>
        <p className="text-sm text-red-400 mb-3">{error ?? "Analysis unavailable"}</p>
        <button
          onClick={() => {
            hasFetched.current = false;
            setError(null);
            setLoading(true);
          }}
          className="text-xs px-3 py-1.5 rounded-lg text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Readiness config ──
  const readinessConfig = {
    "AI-Ready": { color: "#10b981", bg: "#10b98115", icon: "🤖" },
    "Needs Work": { color: "#f59e0b", bg: "#f59e0b15", icon: "⚙️" },
    "Not Optimized": { color: "#ef4444", bg: "#ef444415", icon: "⚠️" },
  }[report.aeoReadiness];

  const citationConfig = {
    High: { color: "#10b981", label: "High Probability" },
    Medium: { color: "#f59e0b", label: "Medium Probability" },
    Low: { color: "#ef4444", label: "Low Probability" },
  }[report.aiCitationProbability];

  const categoryList = Object.values(report.categories);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0f172a 50%, #0d1f35 100%)",
        border: "1px solid #1e3a5f",
        boxShadow: "0 0 0 1px #ffffff08 inset, 0 20px 60px #00000060",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-6 pt-6 pb-4"
        style={{ borderBottom: "1px solid #ffffff08" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f615, #8b5cf615)",
                border: "1px solid #3b82f630",
              }}
            >
              🧠
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Answer Engine Optimization
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                AI citation readiness for ChatGPT, Perplexity & Gemini
              </p>
            </div>
          </div>

          {/* Readiness badge */}
          <div
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: readinessConfig.bg,
              border: `1px solid ${readinessConfig.color}30`,
              color: readinessConfig.color,
            }}
          >
            <span>{readinessConfig.icon}</span>
            {report.aeoReadiness}
          </div>
        </div>

        {/* Score row */}
        <div className="flex items-center gap-6 mt-5">
          <ScoreRing
            score={report.overallScore}
            size={100}
            strokeWidth={7}
            grade={report.overallGrade}
          />

          <div className="flex-1 space-y-3">
            <ScoreBar
              score={report.categories.structuredData.score}
              label="Structured Data"
            />
            <ScoreBar
              score={report.categories.contentStructure.score}
              label="Content Structure"
            />
            <ScoreBar
              score={report.categories.authoritySignals.score}
              label="Authority & Trust"
            />
            <ScoreBar
              score={report.categories.featuredSnippets.score}
              label="Featured Snippets"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">AEO Score</p>
            <p className="text-xl font-bold text-white">{report.overallScore}</p>
            <p className="text-xs text-gray-600">/ 100</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">AI Citation</p>
            <p
              className="text-sm font-bold mt-1"
              style={{ color: citationConfig.color }}
            >
              {report.aiCitationProbability}
            </p>
            <p className="text-xs text-gray-600">Probability</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">Schema Types</p>
            <p className="text-xl font-bold text-white">
              {report.signals.schemaTypes.length}
            </p>
            <p className="text-xs text-gray-600">detected</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex"
        style={{ borderBottom: "1px solid #ffffff08" }}
      >
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "categories", label: "Categories" },
            { id: "opportunities", label: "Fixes" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 text-xs font-semibold transition-colors"
            style={{
              color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="p-5">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Summary */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#ffffff05", border: "1px solid #ffffff08" }}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Analysis Summary
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {report.summary}
              </p>
            </div>

            {/* Competitive Insight */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #3b82f608, #8b5cf608)",
                border: "1px solid #3b82f620",
              }}
            >
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                💡 Competitive Insight
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {report.competitiveInsight}
              </p>
            </div>

            {/* Key Signals Grid */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Key AEO Signals
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Schema Markup",
                    value: report.signals.hasSchemaOrg,
                    key: "schema",
                  },
                  {
                    label: "FAQ Schema",
                    value: report.signals.hasFAQSchema,
                    key: "faq-schema",
                  },
                  {
                    label: "FAQ Section",
                    value: report.signals.hasFAQSection,
                    key: "faq-section",
                  },
                  {
                    label: "Question Headings",
                    value: report.signals.questionHeadingsCount > 0,
                    count: report.signals.questionHeadingsCount,
                    key: "q-headings",
                  },
                  {
                    label: "Author Info",
                    value: report.signals.hasAuthorInfo,
                    key: "author",
                  },
                  {
                    label: "Publish Date",
                    value: report.signals.hasPublishDate,
                    key: "date",
                  },
                  {
                    label: "HowTo Content",
                    value: report.signals.hasHowToSection,
                    key: "howto",
                  },
                  {
                    label: "Direct Answers",
                    value: report.signals.hasDirectAnswers,
                    key: "answers",
                  },
                ].map((sig) => (
                  <div
                    key={sig.key}
                    className="flex items-center gap-2 p-2.5 rounded-lg"
                    style={{
                      background: sig.value
                        ? "rgba(16,185,129,0.06)"
                        : "rgba(239,68,68,0.06)",
                      border: `1px solid ${sig.value ? "#10b98120" : "#ef444420"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{
                        background: sig.value
                          ? "#10b98120"
                          : "#ef444420",
                        color: sig.value ? "#10b981" : "#ef4444",
                      }}
                    >
                      {sig.value ? "✓" : "✗"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">
                        {sig.label}
                      </p>
                      {"count" in sig && sig.count !== undefined && sig.value && (
                        <p className="text-xs text-gray-500">{sig.count} found</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schema types if any */}
            {report.signals.schemaTypes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Detected Schema Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {report.signals.schemaTypes.map((type) => (
                    <span
                      key={type}
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        background: "#3b82f615",
                        border: "1px solid #3b82f630",
                        color: "#93c5fd",
                      }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Question headings preview */}
            {report.signals.questionHeadings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Question-Format Headings Found
                </p>
                <div className="space-y-1">
                  {report.signals.questionHeadings.slice(0, 5).map((q, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg text-xs text-gray-400"
                      style={{ background: "#ffffff04" }}
                    >
                      <span className="text-green-400 flex-shrink-0 mt-0.5">?</span>
                      <span className="italic">{q}</span>
                    </div>
                  ))}
                  {report.signals.questionHeadings.length > 5 && (
                    <p className="text-xs text-gray-600 pl-2">
                      +{report.signals.questionHeadings.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="space-y-2">
            {categoryList.map((category) => (
              <CategorySection key={category.name} category={category} />
            ))}
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === "opportunities" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Sorted by estimated impact on AI citation probability.
            </p>
            {report.topOpportunities.map((opp) => {
              const impactColor = {
                High: "#ef4444",
                Medium: "#f59e0b",
                Low: "#6b7280",
              }[opp.estimatedImpact];
              const effortColor = {
                Easy: "#10b981",
                Medium: "#3b82f6",
                Hard: "#8b5cf6",
              }[opp.effort];

              return (
                <div
                  key={opp.priority}
                  className="rounded-xl p-4"
                  style={{
                    background: "#111827",
                    border: "1px solid #ffffff08",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{
                        background: "#1f2937",
                        color: "#9ca3af",
                      }}
                    >
                      {opp.priority}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white mb-1">
                        {opp.title}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {opp.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            background: impactColor + "15",
                            color: impactColor,
                          }}
                        >
                          {opp.estimatedImpact} Impact
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            background: effortColor + "15",
                            color: effortColor,
                          }}
                        >
                          {opp.effort} Effort
                        </span>
                        <span className="text-xs text-gray-600">
                          {opp.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid #ffffff08" }}
      >
        <p className="text-xs text-gray-600">
          Analyzing: ChatGPT · Perplexity · Gemini · Copilot
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#10b981" }}
          />
          <span className="text-xs text-gray-600">Live</span>
        </div>
      </div>
    </div>
  );
}
