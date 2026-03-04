// components/CategoryCard.tsx
// Displays a single audit category (UX, SEO, Performance, Conversion)
// with score, grade, findings list, and animated progress bar
'use client';

import { useState } from 'react';
import type { AuditSection, AuditFinding } from '@/lib/ai';

interface CategoryCardProps {
  name: string;
  section: AuditSection;
  icon: React.ReactNode;
  delay?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  UX: '◈',
  SEO: '◎',
  Performance: '◊',
  Conversion: '◉',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#00d4ff';
  if (score >= 60) return '#ffb800';
  if (score >= 45) return '#ff7a00';
  return '#ff3366';
}

function FindingBadge({ type }: { type: AuditFinding['type'] }) {
  const config = {
    critical: { bg: 'bg-bad/10', text: 'text-bad', border: 'border-bad/30', label: '✕ CRITICAL' },
    warning:  { bg: 'bg-warn/10', text: 'text-warn', border: 'border-warn/30', label: '⚠ WARNING' },
    info:     { bg: 'bg-signal/10', text: 'text-signal', border: 'border-signal/30', label: '○ INFO' },
    good:     { bg: 'bg-good/10', text: 'text-good', border: 'border-good/30', label: '✓ GOOD' },
  }[type];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${config.bg} ${config.text} ${config.border} shrink-0`}
    >
      {config.label}
    </span>
  );
}

function ImpactDot({ impact }: { impact: AuditFinding['impact'] }) {
  const color = impact === 'high' ? 'bg-bad' : impact === 'medium' ? 'bg-warn' : 'bg-text-muted';
  return (
    <span className="flex items-center gap-1 text-xs font-mono text-text-muted shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {impact.toUpperCase()}
    </span>
  );
}

export default function CategoryCard({ name, section, icon, delay = 0 }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = getScoreColor(section.score);
  const displayedFindings = expanded ? section.findings : section.findings.slice(0, 3);

  return (
    <div
      className="panel overflow-hidden transition-all duration-300 hover:border-border-bright"
      style={{ animation: `fadeUp 0.5s ease ${delay}ms both` }}
    >
      {/* ── Card header ──────────────────────────────── */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono"
              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
            >
              {CATEGORY_ICONS[name] ?? '◌'}
            </div>
            <div>
              <h3 className="font-display font-bold text-text-primary text-lg">{name}</h3>
              <p className="text-text-muted text-xs font-mono">
                {section.findings.length} findings
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div
              className="font-display font-bold text-3xl leading-none"
              style={{ color, textShadow: `0 0 16px ${color}40` }}
            >
              {section.score}
            </div>
            <div className="text-text-muted text-xs font-mono mt-1">
              Grade {section.grade}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${section.score}%`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}60`,
                transitionDelay: `${delay + 200}ms`,
              }}
            />
          </div>
        </div>

        {/* Summary */}
        <p className="mt-3 text-text-secondary text-sm leading-relaxed">
          {section.summary}
        </p>
      </div>

      {/* ── Findings list ─────────────────────────── */}
      <div className="divide-y divide-border">
        {displayedFindings.map((finding, i) => (
          <div key={i} className="p-4 hover:bg-surface/50 transition-colors">
            <div className="flex items-start gap-3">
              <FindingBadge type={finding.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-body font-medium text-text-primary text-sm">
                    {finding.title}
                  </p>
                  <ImpactDot impact={finding.impact} />
                </div>
                <p className="text-text-secondary text-xs leading-relaxed mt-1">
                  {finding.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Show more toggle ──────────────────────── */}
      {section.findings.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-mono text-signal hover:text-signal-dim transition-colors border-t border-border"
        >
          {expanded
            ? '↑ Show less'
            : `↓ Show ${section.findings.length - 3} more findings`}
        </button>
      )}
    </div>
  );
}
