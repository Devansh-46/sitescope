// components/LighthouseMetrics.tsx
// Displays Lighthouse performance metrics in a clean grid
'use client';

import type { LighthouseScores } from '@/lib/lighthouse';

interface LighthouseMetricsProps {
  data: LighthouseScores;
}

function getMetricColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 50) return '#ffb800';
  return '#ff3366';
}

function MetricBar({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-mono text-text-muted">{label}</span>
        <span className="text-sm font-mono font-bold text-text-primary">{value}</span>
      </div>
    </div>
  );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = getMetricColor(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, #1a2535 0deg)`,
        }}
      >
        <div className="w-12 h-12 rounded-full bg-panel flex items-center justify-center">
          <span className="font-mono font-bold text-sm" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs font-mono text-text-muted text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export default function LighthouseMetrics({ data }: LighthouseMetricsProps) {
  return (
    <div className="panel p-6" style={{ animation: 'fadeUp 0.5s ease 400ms both' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-signal/10 border border-signal/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display font-bold text-text-primary text-lg">
            Lighthouse Scores
          </h2>
          <p className="text-text-muted text-xs font-mono">Google Lighthouse audit</p>
        </div>
      </div>

      {/* Category scores */}
      <div className="grid grid-cols-4 gap-4 pb-6 border-b border-border mb-6">
        <ScoreCircle score={data.performance} label="Performance" />
        <ScoreCircle score={data.accessibility} label="Accessibility" />
        <ScoreCircle score={data.bestPractices} label="Best Practices" />
        <ScoreCircle score={data.seo} label="SEO" />
      </div>

      {/* Core Web Vitals */}
      <h3 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-4">
        Core Web Vitals
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricBar label="First Contentful Paint" value={data.firstContentfulPaint} />
        <MetricBar label="Largest Contentful Paint" value={data.largestContentfulPaint} />
        <MetricBar label="Total Blocking Time" value={data.totalBlockingTime} />
        <MetricBar label="Cumulative Layout Shift" value={data.cumulativeLayoutShift} />
        <MetricBar label="Speed Index" value={data.speedIndex} />
        <MetricBar label="Time to Interactive" value={data.timeToInteractive} />
      </div>

      {/* Opportunities */}
      {data.opportunities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-3">
            Top Opportunities
          </h3>
          <div className="space-y-2">
            {data.opportunities.slice(0, 3).map((opp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface">
                <span className="text-warn mt-0.5">⚡</span>
                <div>
                  <p className="text-sm font-body text-text-primary">{opp.title}</p>
                  <p className="text-xs font-mono text-text-muted mt-0.5">{opp.savings}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
