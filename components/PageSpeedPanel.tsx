'use client';

// components/PageSpeedPanel.tsx
// Rich PageSpeed Insights panel — mobile/desktop toggle, score rings,
// Core Web Vitals, opportunities list, and diagnostics.
// Data comes from /api/pagespeed and is fetched client-side on the report page.

import { useState, useEffect, useCallback } from 'react';
import type { PageSpeedReport, PageSpeedResult } from '@/lib/pagespeed';

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#00d4ff';
  if (score >= 50) return '#ffb800';
  if (score >= 25) return '#ff7a00';
  return '#ff3366';
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Fast';
  if (score >= 50) return 'Needs work';
  return 'Slow';
}

function cwvStatus(score: number): 'good' | 'needs-improvement' | 'poor' {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

const CWV_STATUS_COLORS = {
  good: '#00ff88',
  'needs-improvement': '#ffb800',
  poor: '#ff3366',
};

// ── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  label,
  size = 72,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  const color = scoreColor(score);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    let frame = 0;
    const total = 45;
    const id = setInterval(() => {
      frame++;
      const p = 1 - Math.pow(1 - frame / total, 3);
      setDisplayed(Math.round(score * p));
      setOffset(circ - (score / 100) * circ * p);
      if (frame >= total) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [score, circ]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1a2535" strokeWidth="7" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke 0.3s' }}
        />
        <text x="32" y="36" textAnchor="middle" fill={color}
          fontSize="14" fontWeight="700" fontFamily="var(--font-mono)">
          {displayed}
        </text>
      </svg>
      <span className="text-xs font-mono text-text-muted text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Metric Row ──────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: 'good' | 'needs-improvement' | 'poor';
}) {
  const dotColor = status ? CWV_STATUS_COLORS[status] : '#3d5269';
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs font-mono text-text-muted">{label}</span>
      </div>
      <span className="text-sm font-mono font-bold text-text-primary">{value}</span>
    </div>
  );
}

// ── Opportunity Bar ─────────────────────────────────────────────────────────

function OpportunityRow({ opp }: { opp: PageSpeedReport['desktop']['metrics']['opportunities'][0] }) {
  const pct = Math.min(100, Math.round((opp.savingsMs / 5000) * 100));
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-body text-text-primary leading-tight pr-3">{opp.title}</span>
        <span className="text-xs font-mono font-bold text-warn shrink-0">{opp.displaySavings}</span>
      </div>
      <div className="h-1 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #ffb800, #ff7a00)',
          }}
        />
      </div>
    </div>
  );
}

// ── Strategy Panel ──────────────────────────────────────────────────────────

function StrategyPanel({ result }: { result: PageSpeedResult }) {
  if (!result.available) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-warn/10 border border-warn/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-text-primary">Data Unavailable</p>
        {result.errorMessage && (
          <p className="text-xs text-text-muted max-w-xs font-mono">{result.errorMessage}</p>
        )}
      </div>
    );
  }

  const { categories, metrics } = result;

  // CWV status based on score
  const perfStatus = cwvStatus(categories.performance);

  return (
    <div className="space-y-6">
      {/* Score rings */}
      <div className="grid grid-cols-4 gap-2 pb-5 border-b border-border">
        <ScoreRing score={categories.performance} label="Performance" />
        <ScoreRing score={categories.accessibility} label="Accessibility" />
        <ScoreRing score={categories.bestPractices} label="Best Practices" />
        <ScoreRing score={categories.seo} label="SEO" />
      </div>

      {/* Performance verdict */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg border"
        style={{
          borderColor: `${scoreColor(categories.performance)}30`,
          backgroundColor: `${scoreColor(categories.performance)}08`,
        }}
      >
        <span
          className="text-2xl font-display font-bold"
          style={{ color: scoreColor(categories.performance) }}
        >
          {categories.performance}
        </span>
        <div>
          <p className="text-sm font-bold text-text-primary" style={{ color: scoreColor(categories.performance) }}>
            {scoreLabel(categories.performance)}
          </p>
          <p className="text-xs font-mono text-text-muted">Performance score</p>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h4 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
          Core Web Vitals
        </h4>
        <div>
          <MetricRow label="First Contentful Paint" value={metrics.firstContentfulPaint} />
          <MetricRow label="Largest Contentful Paint" value={metrics.largestContentfulPaint}
            status={perfStatus} />
          <MetricRow label="Total Blocking Time" value={metrics.totalBlockingTime}
            status={cwvStatus(categories.performance > 50 ? 90 : 30)} />
          <MetricRow label="Cumulative Layout Shift" value={metrics.cumulativeLayoutShift} />
          <MetricRow label="Speed Index" value={metrics.speedIndex} />
          <MetricRow label="Time to Interactive" value={metrics.timeToInteractive} />
        </div>
      </div>

      {/* Opportunities */}
      {metrics.opportunities.length > 0 && (
        <div>
          <h4 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            ⚡ Opportunities ({metrics.opportunities.length})
          </h4>
          <div>
            {metrics.opportunities.slice(0, 5).map((opp) => (
              <OpportunityRow key={opp.id} opp={opp} />
            ))}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {metrics.diagnostics.length > 0 && (
        <div>
          <h4 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            🔍 Diagnostics
          </h4>
          <div className="space-y-1">
            {metrics.diagnostics.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <span className="text-warn text-xs mt-0.5">▸</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body text-text-primary">{d.title}</p>
                  {d.displayValue && (
                    <p className="text-xs font-mono text-text-muted">{d.displayValue}</p>
                  )}
                </div>
                {d.score !== null && (
                  <span
                    className="text-xs font-mono font-bold shrink-0"
                    style={{ color: scoreColor(d.score) }}
                  >
                    {d.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface PageSpeedPanelProps {
  url: string;
  /** Pre-fetched report (optional — if not provided, fetches on mount) */
  initialData?: PageSpeedReport;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function PageSpeedPanel({ url, initialData }: PageSpeedPanelProps) {
  const [data, setData] = useState<PageSpeedReport | null>(initialData ?? null);
  const [status, setStatus] = useState<Status>(initialData ? 'done' : 'idle');
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState<'desktop' | 'mobile'>('desktop');

  const fetch_ = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/pagespeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setData(json as PageSpeedReport);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  }, [url]);

  // Auto-fetch on mount if no initial data
  useEffect(() => {
    if (!initialData) fetch_();
  }, [fetch_, initialData]);

  const result = data ? data[strategy] : null;

  return (
    <div className="panel p-6" style={{ animation: 'fadeUp 0.5s ease 400ms both' }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-signal/10 border border-signal/20 flex items-center justify-center">
            {/* PageSpeed gauge icon */}
            <svg className="w-4 h-4 text-signal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-text-primary text-lg">PageSpeed Insights</h2>
            <p className="text-text-muted text-xs font-mono">
              {data
                ? `Fetched ${new Date(data.fetchedAt).toLocaleTimeString()}`
                : 'Google PageSpeed API'}
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetch_}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-signal transition-colors disabled:opacity-40"
          title="Re-run PageSpeed"
        >
          <svg
            className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {status === 'loading' ? 'Running…' : 'Re-run'}
        </button>
      </div>

      {/* ── Mobile / Desktop Toggle ── */}
      {status === 'done' && data && (
        <div className="flex gap-1 p-1 bg-surface rounded-lg mb-5 w-fit">
          {(['desktop', 'mobile'] as const).map((s) => {
            const score = data[s].categories.performance;
            const active = strategy === s;
            return (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${active
                    ? 'bg-panel border border-border text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {s === 'desktop' ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4m-4 4h4m-4 0H9m0 0v-4" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {data[s].available && (
                  <span
                    className="font-bold"
                    style={{ color: scoreColor(score) }}
                  >
                    {score}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── States ── */}
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-signal/20 border-t-signal animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-signal/30 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono text-text-primary animate-pulse">Running PageSpeed analysis…</p>
            <p className="text-xs font-mono text-text-muted mt-1">Mobile + desktop · may take 30–60s</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-bad/10 border border-bad/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-bad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">PageSpeed failed</p>
            <p className="text-xs text-text-muted font-mono mt-1 max-w-xs">{error}</p>
          </div>
          <button
            onClick={fetch_}
            className="mt-2 px-4 py-2 text-xs font-mono border border-border rounded-lg text-text-primary hover:border-signal/40 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {status === 'done' && result && <StrategyPanel result={result} />}

      {/* Footer */}
      {status === 'done' && (
        <p className="mt-4 text-xs font-mono text-text-muted/40 text-right">
          Powered by Google PageSpeed Insights API
        </p>
      )}
    </div>
  );
}