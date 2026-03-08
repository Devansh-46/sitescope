"use client";

// components/AEOPanel.tsx
// Answer Engine Optimization Panel — styled to match SiteScope CategoryCard theme

import { useState, useEffect, useRef } from "react";
import type { AEOReport, AEOCategory, AEOFinding } from "@/lib/aeo";

interface AEOPanelProps {
  url: string;
  initialReport?: AEOReport | null;
}

// ─── Score progress bar (matches the amber bar in CategoryCard) ──────────────
function ScoreBar({ score, label }: { score: number; label: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 120);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 75 ? "#f59e0b" : score >= 60 ? "#f59e0b" : score >= 45 ? "#f97316" : "#ef4444";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: "#1a1a2e" }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Finding row — matches CategoryCard finding style ────────────────────────
function FindingRow({ finding }: { finding: AEOFinding }) {
  const badgeConfig = {
    pass: { label: "PASS", color: "#10b981", border: "#10b98140" },
    fail: { label: "FAIL", color: "#ef4444", border: "#ef444440" },
    warning: { label: "WARNING", color: "#f59e0b", border: "#f59e0b40" },
  }[finding.type];

  const impactDot = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#6b7280",
  }[finding.impact];

  const impactLabel = {
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  }[finding.impact];

  return (
    <div
      className="py-4"
      style={{ borderBottom: "1px solid #1e1e2e" }}
    >
      <div className="flex items-start gap-3">
        {/* Badge chip — matches WARNING/CRITICAL style */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase mt-0.5"
          style={{
            border: `1px solid ${badgeConfig.border}`,
            color: badgeConfig.color,
            background: badgeConfig.color + "12",
            letterSpacing: "0.04em",
          }}
        >
          {finding.type === "warning" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
          )}
          {finding.type === "fail" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          )}
          {finding.type === "pass" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
          {badgeConfig.label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-white">{finding.title}</p>
            {/* Impact dot — matches the HIGH/MEDIUM dots in CategoryCard */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: impactDot }} />
              <span className="text-xs font-semibold" style={{ color: impactDot }}>
                {impactLabel}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#8b8ba7" }}>
            {finding.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Category accordion — matches CategoryCard expand pattern ────────────────
function CategorySection({ category }: { category: AEOCategory }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    category.score >= 75
      ? "#f59e0b"
      : category.score >= 60
        ? "#f59e0b"
        : category.score >= 45
          ? "#f97316"
          : "#ef4444";

  const failCount = category.findings.filter((f) => f.type === "fail").length;
  const passCount = category.findings.filter((f) => f.type === "pass").length;
  const warnCount = category.findings.filter((f) => f.type === "warning").length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #1e1e2e", background: "#0d0d1a" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        {/* Score block — matches the big number in CategoryCard header */}
        <div className="flex-shrink-0 text-right" style={{ minWidth: 48 }}>
          <div className="text-2xl font-bold leading-none" style={{ color: scoreColor }}>
            {category.score}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#4a4a6a" }}>
            Grade {category.grade}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-px h-10 flex-shrink-0" style={{ background: "#1e1e2e" }} />

        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">{category.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "#4a4a6a" }}>
            {category.findings.length} findings
          </p>
        </div>

        {/* Mini finding count pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {passCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "#10b98115", color: "#10b981" }}>
              {passCount}✓
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "#f59e0b15", color: "#f59e0b" }}>
              {warnCount}!
            </span>
          )}
          {failCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "#ef444415", color: "#ef4444" }}>
              {failCount}✗
            </span>
          )}
        </div>

        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: "#4a4a6a", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Score bar */}
      <div className="px-5 pb-3" style={{ borderTop: "1px solid #1e1e2e" }}>
        <div className="h-1 rounded-full mt-3" style={{ background: "#1a1a2e" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${category.score}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-2" style={{ borderTop: "1px solid #1e1e2e" }}>
          {category.findings.map((finding, i) => (
            <FindingRow key={i} finding={finding} />
          ))}
          {category.opportunities.length > 0 && (
            <div className="mt-3 mb-3 p-3 rounded-lg" style={{ background: "#0a0a18", border: "1px solid #1e1e2e" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#4a4a6a" }}>
                Opportunities
              </p>
              <ul className="space-y-1.5">
                {category.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#8b8ba7" }}>
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
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

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ background: "#0d0d1a", border: "1px solid #1e1e2e" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg animate-pulse" style={{ background: "#1e1e2e" }} />
          <div>
            <div className="h-4 w-52 rounded animate-pulse" style={{ background: "#1e1e2e" }} />
            <div className="h-3 w-36 rounded mt-1.5 animate-pulse" style={{ background: "#1a1a2e" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "#1e1e2e" }} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#4a4a6a" }}>
          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
          Analyzing AEO signals...
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !report) {
    return (
      <div className="rounded-xl p-6" style={{ background: "#0d0d1a", border: "1px solid #ef444430" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
            style={{ background: "#ef444415", border: "1px solid #ef444430" }}>🧠</div>
          <div>
            <p className="text-sm font-bold text-white">Answer Engine Optimization</p>
            <p className="text-xs" style={{ color: "#4a4a6a" }}>AEO Analysis</p>
          </div>
        </div>
        <p className="text-sm text-red-400 mb-3">{error ?? "Analysis unavailable"}</p>
        <button
          onClick={() => { hasFetched.current = false; setError(null); setLoading(true); }}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#f59e0b", border: "1px solid #f59e0b30", background: "#f59e0b08" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const scoreColor =
    report.overallScore >= 75 ? "#f59e0b"
      : report.overallScore >= 60 ? "#f59e0b"
        : report.overallScore >= 45 ? "#f97316"
          : "#ef4444";

  const readinessConfig = {
    "AI-Ready": { color: "#10b981", border: "#10b98140", icon: "🤖" },
    "Needs Work": { color: "#f59e0b", border: "#f59e0b40", icon: "⚙️" },
    "Not Optimized": { color: "#ef4444", border: "#ef444440", icon: "⚠️" },
  }[report.aeoReadiness];

  const citationConfig = {
    High: { color: "#10b981" },
    Medium: { color: "#f59e0b" },
    Low: { color: "#ef4444" },
  }[report.aiCitationProbability];

  const categoryList = Object.values(report.categories);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d1a", border: "1px solid #1e1e2e" }}>

      {/* ── Header — matches CategoryCard header layout ── */}
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #1e1e2e" }}>
        <div className="flex items-start justify-between gap-4">

          {/* Left: icon + title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ background: "#1e1e2e", border: "1px solid #2a2a3e" }}>
              🧠
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Answer Engine Optimization</h3>
              <p className="text-xs mt-0.5" style={{ color: "#4a4a6a" }}>
                AI citation readiness · {report.signals.schemaTypes.length} schema types detected
              </p>
            </div>
          </div>

          {/* Right: big score number (matches CategoryCard) */}
          <div className="flex-shrink-0 text-right">
            <div className="text-3xl font-bold leading-none" style={{ color: scoreColor }}>
              {report.overallScore}
            </div>
            <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>Grade {report.overallGrade}</div>
          </div>
        </div>

        {/* Progress bar — amber, full width, matches CategoryCard */}
        <div className="mt-4 h-1 rounded-full" style={{ background: "#1a1a2e" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${report.overallScore}%`, backgroundColor: scoreColor }}
          />
        </div>

        {/* Readiness + citation badges row */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase"
            style={{
              border: `1px solid ${readinessConfig.border}`,
              color: readinessConfig.color,
              background: readinessConfig.color + "12",
              letterSpacing: "0.04em",
            }}
          >
            <span>{readinessConfig.icon}</span>
            {report.aeoReadiness}
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase"
            style={{
              border: `1px solid ${citationConfig.color}30`,
              color: citationConfig.color,
              background: citationConfig.color + "10",
              letterSpacing: "0.04em",
            }}
          >
            AI Citation: {report.aiCitationProbability}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex" style={{ borderBottom: "1px solid #1e1e2e" }}>
        {([
          { id: "overview", label: "Overview" },
          { id: "categories", label: "Categories" },
          { id: "opportunities", label: "Fixes" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors"
            style={{
              color: activeTab === tab.id ? "#f59e0b" : "#4a4a6a",
              borderBottom: activeTab === tab.id ? "2px solid #f59e0b" : "2px solid transparent",
              background: "transparent",
              letterSpacing: "0.06em",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="p-5">

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-5">

            {/* Summary */}
            <p className="text-sm leading-relaxed" style={{ color: "#8b8ba7" }}>
              {report.summary}
            </p>

            {/* Score bars grid */}
            <div className="grid grid-cols-1 gap-3">
              <ScoreBar score={report.categories.structuredData.score} label="Structured Data" />
              <ScoreBar score={report.categories.contentStructure.score} label="Content Structure" />
              <ScoreBar score={report.categories.authoritySignals.score} label="Authority & Trust" />
              <ScoreBar score={report.categories.featuredSnippets.score} label="Featured Snippets" />
              <ScoreBar score={report.categories.conversationalOptimization.score} label="Conversational" />
            </div>

            {/* Competitive insight box */}
            <div className="rounded-lg p-4" style={{ background: "#0a0a18", border: "1px solid #1e1e2e" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#f59e0b", letterSpacing: "0.06em" }}>
                💡 Competitive Insight
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#8b8ba7" }}>
                {report.competitiveInsight}
              </p>
            </div>

            {/* Key signals grid */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#4a4a6a", letterSpacing: "0.06em" }}>
                Key AEO Signals
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Schema Markup", value: report.signals.hasSchemaOrg },
                  { label: "FAQ Schema", value: report.signals.hasFAQSchema },
                  { label: "FAQ Section", value: report.signals.hasFAQSection },
                  { label: "Question Headings", value: report.signals.questionHeadingsCount > 0, count: report.signals.questionHeadingsCount },
                  { label: "Author Info", value: report.signals.hasAuthorInfo },
                  { label: "Publish Date", value: report.signals.hasPublishDate },
                  { label: "HowTo Content", value: report.signals.hasHowToSection },
                  { label: "Direct Answers", value: report.signals.hasDirectAnswers },
                ].map((sig) => (
                  <div
                    key={sig.label}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                    style={{
                      background: "#0a0a18",
                      border: `1px solid ${sig.value ? "#10b98120" : "#1e1e2e"}`,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: sig.value ? "#10b98120" : "#ef444415",
                        color: sig.value ? "#10b981" : "#ef4444",
                      }}
                    >
                      {sig.value ? "✓" : "✗"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 truncate">{sig.label}</p>
                      {"count" in sig && sig.count && sig.value ? (
                        <p className="text-xs" style={{ color: "#4a4a6a" }}>{sig.count} found</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schema type tags */}
            {report.signals.schemaTypes.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#4a4a6a", letterSpacing: "0.06em" }}>
                  Detected Schema Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {report.signals.schemaTypes.map((type) => (
                    <span
                      key={type}
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{ background: "#f59e0b12", border: "1px solid #f59e0b25", color: "#f59e0b" }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {activeTab === "categories" && (
          <div className="space-y-2">
            {categoryList.map((category) => (
              <CategorySection key={category.name} category={category} />
            ))}
          </div>
        )}

        {/* Opportunities */}
        {activeTab === "opportunities" && (
          <div className="space-y-2">
            <p className="text-xs mb-3" style={{ color: "#4a4a6a" }}>
              Sorted by estimated impact on AI citation probability.
            </p>
            {report.topOpportunities.map((opp) => {
              const impactColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#6b7280" }[opp.estimatedImpact];
              const effortColor = { Easy: "#10b981", Medium: "#3b82f6", Hard: "#8b5cf6" }[opp.effort];
              return (
                <div key={opp.priority} className="rounded-lg p-4" style={{ background: "#0a0a18", border: "1px solid #1e1e2e" }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                      style={{ background: "#1e1e2e", color: "#4a4a6a" }}>
                      {opp.priority}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white mb-1">{opp.title}</p>
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: "#8b8ba7" }}>{opp.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: impactColor + "15", color: impactColor }}>
                          {opp.estimatedImpact} Impact
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: effortColor + "15", color: effortColor }}>
                          {opp.effort} Effort
                        </span>
                        <span className="text-xs" style={{ color: "#4a4a6a" }}>{opp.category}</span>
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
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1e1e2e" }}>
        <p className="text-xs" style={{ color: "#2a2a3e" }}>
          Analyzing: ChatGPT · Perplexity · Gemini · Copilot
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f59e0b" }} />
          <span className="text-xs" style={{ color: "#2a2a3e" }}>Live</span>
        </div>
      </div>
    </div>
  );
}