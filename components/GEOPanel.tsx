"use client";

// components/GEOPanel.tsx
// Generative Engine Optimization Panel for SiteScope Report

import { useState, useEffect, useRef } from "react";
import type { GEOReport, GEOCategory, GEOFinding } from "@/lib/geo";

interface GEOPanelProps {
  url: string;
  initialReport?: GEOReport | null;
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
function FindingRow({ finding }: { finding: GEOFinding }) {
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
function CategorySection({ category }: { category: GEOCategory }) {
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
                    <span className="text-purple-400 mt-0.5 flex-shrink-0">→</span>
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

// ─── Main GEO Panel ──────────────────────────────────────────────────────────
export default function GEOPanel({ url, initialReport }: GEOPanelProps) {
  const [report, setReport] = useState<GEOReport | null>(initialReport ?? null);
  const [loading, setLoading] = useState(!initialReport);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "opportunities">("overview");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (initialReport || hasFetched.current) return;
    hasFetched.current = true;

    const fetchGEO = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/geo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error(`GEO analysis failed (${res.status})`);
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchGEO();
  }, [url, initialReport]);

  // ── Loading state ──
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
          border: "1px solid #3b1f5f",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 animate-pulse" />
          <div>
            <div className="h-4 w-56 bg-white/10 rounded mb-1.5" />
            <div className="h-3 w-36 bg-white/5 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
          Analyzing brand representation signals...
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
            🌐
          </div>
          <div>
            <p className="text-sm font-semibold text-white">GEO Analysis</p>
            <p className="text-xs text-gray-500">Generative Engine Optimization</p>
          </div>
        </div>
        <p className="text-sm text-red-400 mb-3">{error ?? "Analysis unavailable"}</p>
        <button
          onClick={() => {
            hasFetched.current = false;
            setError(null);
            setLoading(true);
          }}
          className="text-xs px-3 py-1.5 rounded-lg text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Readiness config ──
  const readinessConfig = {
    "AI-Optimized": { color: "#10b981", bg: "#10b98115", icon: "✨" },
    "Needs Work": { color: "#f59e0b", bg: "#f59e0b15", icon: "⚙️" },
    "Not Optimized": { color: "#ef4444", bg: "#ef444415", icon: "⚠️" },
  }[report.geoReadiness];

  const mentionConfig = {
    High: { color: "#10b981", label: "High Probability" },
    Medium: { color: "#f59e0b", label: "Medium Probability" },
    Low: { color: "#ef4444", label: "Low Probability" },
  }[report.aiMentionProbability];

  const categoryList = Object.values(report.categories);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0d0a28 0%, #0f172a 50%, #150d35 100%)",
        border: "1px solid #2d1a5f",
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
                background: "linear-gradient(135deg, #8b5cf615, #a855f715)",
                border: "1px solid #8b5cf630",
              }}
            >
              🌐
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Generative Engine Optimization
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                How ChatGPT & Gemini represent your brand
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
            {report.geoReadiness}
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
              score={report.categories.brandIdentity.score}
              label="Brand Identity"
            />
            <ScoreBar
              score={report.categories.trustAuthority.score}
              label="Trust & Authority"
            />
            <ScoreBar
              score={report.categories.knowledgePanel.score}
              label="Knowledge Panel"
            />
            <ScoreBar
              score={report.categories.aiDiscoverability.score}
              label="AI Discoverability"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">GEO Score</p>
            <p className="text-xl font-bold text-white">{report.overallScore}</p>
            <p className="text-xs text-gray-600">/ 100</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">AI Mention</p>
            <p
              className="text-sm font-bold mt-1"
              style={{ color: mentionConfig.color }}
            >
              {report.aiMentionProbability}
            </p>
            <p className="text-xs text-gray-600">Probability</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
          >
            <p className="text-xs text-gray-500 mb-1">Social Profiles</p>
            <p className="text-xl font-bold text-white">
              {report.signals.socialProfilesCount}
            </p>
            <p className="text-xs text-gray-600">linked</p>
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
              color: activeTab === tab.id ? "#8b5cf6" : "#6b7280",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #8b5cf6"
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

            {/* AI Brand Summary simulation */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #8b5cf608, #a855f708)",
                border: "1px solid #8b5cf625",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✨</span>
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Simulated AI Brand Description
                </p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "{report.brandSummary}"
              </p>
              <p className="text-xs text-gray-600 mt-2">
                How ChatGPT or Gemini might describe this brand based on available signals
              </p>
            </div>

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
                background: "linear-gradient(135deg, #8b5cf608, #6366f108)",
                border: "1px solid #8b5cf620",
              }}
            >
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                💡 Competitive Insight
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {report.competitiveInsight}
              </p>
            </div>

            {/* Key GEO Signals Grid */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Key GEO Signals
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Organization Schema",
                    value: report.signals.hasOrganizationSchema,
                    key: "org-schema",
                  },
                  {
                    label: "sameAs Entity Links",
                    value: report.signals.hasSameAsLinks,
                    count: report.signals.sameAsCount,
                    key: "same-as",
                  },
                  {
                    label: "Wikipedia / Wikidata",
                    value: report.signals.hasWikipediaRef || report.signals.hasWikidataRef,
                    key: "wiki",
                  },
                  {
                    label: "Logo in Schema",
                    value: report.signals.hasOrganizationLogo,
                    key: "logo",
                  },
                  {
                    label: "Press Coverage",
                    value: report.signals.hasPressOrNews,
                    key: "press",
                  },
                  {
                    label: "Social Profiles",
                    value: report.signals.hasSocialProfiles,
                    count: report.signals.socialProfilesCount,
                    key: "social",
                  },
                  {
                    label: "Original Research",
                    value: report.signals.hasOriginalResearch,
                    key: "research",
                  },
                  {
                    label: "Value Proposition",
                    value: report.signals.hasClearValueProposition,
                    key: "value-prop",
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
                        background: sig.value ? "#10b98120" : "#ef444420",
                        color: sig.value ? "#10b981" : "#ef4444",
                      }}
                    >
                      {sig.value ? "✓" : "✗"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{sig.label}</p>
                      {"count" in sig && sig.count !== undefined && sig.value && (
                        <p className="text-xs text-gray-500">{sig.count} found</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand name info */}
            {report.signals.brandName && report.signals.brandName !== "Unknown" && (
              <div
                className="rounded-xl p-4"
                style={{ background: "#ffffff04", border: "1px solid #ffffff08" }}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Brand Entity Detection
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {report.signals.brandName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Detected brand name · appears {report.signals.brandNameFrequency}× on page
                    </p>
                  </div>
                  <div className="text-right">
                    {report.signals.hasWikipediaRef && (
                      <span className="text-xs px-2 py-0.5 rounded-full mr-1"
                        style={{ background: "#10b98115", color: "#10b981", border: "1px solid #10b98130" }}>
                        Wikipedia
                      </span>
                    )}
                    {report.signals.hasWikidataRef && (
                      <span className="text-xs px-2 py-0.5 rounded-full mr-1"
                        style={{ background: "#3b82f615", color: "#93c5fd", border: "1px solid #3b82f630" }}>
                        Wikidata
                      </span>
                    )}
                    {report.signals.hasCrunchbaseRef && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#f59e0b15", color: "#fbbf24", border: "1px solid #f59e0b30" }}>
                        Crunchbase
                      </span>
                    )}
                  </div>
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
              Sorted by estimated impact on AI brand mention probability.
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
                      style={{ background: "#1f2937", color: "#9ca3af" }}
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
                          style={{ background: impactColor + "15", color: impactColor }}
                        >
                          {opp.estimatedImpact} Impact
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ background: effortColor + "15", color: effortColor }}
                        >
                          {opp.effort} Effort
                        </span>
                        <span className="text-xs text-gray-600">{opp.category}</span>
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
          Analyzing: ChatGPT · Gemini · Copilot · Perplexity
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#8b5cf6" }}
          />
          <span className="text-xs text-gray-600">Live</span>
        </div>
      </div>
    </div>
  );
}
