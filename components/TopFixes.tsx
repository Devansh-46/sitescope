// components/TopFixes.tsx
// Displays the prioritized list of top fixes from the AI audit
'use client';

interface TopFixesProps {
  fixes: string[];
}

const PRIORITY_COLORS = [
  { bg: 'bg-bad/10', border: 'border-bad/30', text: 'text-bad', label: 'P1' },
  { bg: 'bg-bad/8', border: 'border-bad/20', text: 'text-bad', label: 'P2' },
  { bg: 'bg-warn/10', border: 'border-warn/30', text: 'text-warn', label: 'P3' },
  { bg: 'bg-warn/8', border: 'border-warn/20', text: 'text-warn', label: 'P4' },
  { bg: 'bg-signal/10', border: 'border-signal/30', text: 'text-signal', label: 'P5' },
];

export default function TopFixes({ fixes }: TopFixesProps) {
  return (
    <div className="panel p-6" style={{ animation: 'fadeUp 0.5s ease 200ms both' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-bad/10 border border-bad/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-bad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display font-bold text-text-primary text-lg">
            Priority Fixes
          </h2>
          <p className="text-text-muted text-xs font-mono">
            Ranked by business impact
          </p>
        </div>
      </div>

      {/* Fixes list */}
      <div className="space-y-3">
        {fixes.map((fix, i) => {
          const priority = PRIORITY_COLORS[i] ?? PRIORITY_COLORS[4];
          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 rounded-lg border ${priority.bg} ${priority.border}`}
              style={{ animation: `fadeUp 0.4s ease ${300 + i * 80}ms both` }}
            >
              {/* Priority badge */}
              <span
                className={`font-mono text-xs font-bold px-2 py-1 rounded ${priority.bg} ${priority.text} border ${priority.border} shrink-0 mt-0.5`}
              >
                {priority.label}
              </span>

              {/* Fix text */}
              <p className="text-text-primary text-sm leading-relaxed font-body">
                {fix}
              </p>

              {/* Arrow */}
              <svg
                className={`w-4 h-4 ${priority.text} shrink-0 mt-0.5 opacity-50`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
