// app/page.tsx
// Landing page — hero section + URL input form
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Normalize URL — add https:// if user forgot
  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleAnalyze = async () => {
    setError('');
    const normalizedUrl = normalizeUrl(url);

    // Basic client-side validation
    try {
      new URL(normalizedUrl);
    } catch {
      setError('Please enter a valid website URL');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Analysis failed');
      }

      if (!data.reportId) {
        throw new Error('No report ID returned from server');
      }

      // Redirect immediately — report page shows ProcessingScreen
      // while the background pipeline runs (polls every 5s)
      router.push(`/report/${data.reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  return (
    <main className="relative min-h-screen bg-void overflow-hidden">
      {/* ── Background grid ─────────────────────────────── */}
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />

      {/* ── Radial glow at top ───────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial-signal pointer-events-none" />

      {/* ── Scanning line effect ────────────────────────── */}
      <div
        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-signal/30 to-transparent pointer-events-none"
        style={{ animation: 'scan 4s linear infinite' }}
      />

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <circle cx="16" cy="16" r="14" stroke="#00d4ff" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="8" stroke="#00d4ff" strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="16" cy="16" r="2" fill="#00d4ff" />
              <line x1="16" y1="2" x2="16" y2="8" stroke="#00d4ff" strokeWidth="1.5" />
              <line x1="30" y1="16" x2="24" y2="16" stroke="#00d4ff" strokeWidth="1.5" />
            </svg>
            <div className="absolute inset-0 rounded-full bg-signal/10 animate-ping" />
          </div>
          <span className="font-display font-bold text-xl text-text-primary tracking-tight">
            Site<span className="text-signal">Scope</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-text-secondary font-body">
          <span className="hidden md:inline font-mono text-xs text-text-muted border border-border px-3 py-1 rounded-full">
            v1.0 BETA
          </span>
        </div>
      </nav>

      {/* ── Hero Content ────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 max-w-4xl mx-auto">

        {/* Status badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 border border-signal/30 bg-signal/5 rounded-full px-4 py-2 text-xs font-mono text-signal"
          style={{ animation: 'fadeUp 0.5s ease forwards' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse-slow" />
          AI AUDIT ENGINE ONLINE
        </div>

        {/* Headline */}
        <h1
          className="font-display font-bold text-5xl md:text-7xl leading-none tracking-tight mb-6"
          style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}
        >
          <span className="text-text-primary">X-ray your</span>
          <br />
          <span className="text-signal text-glow">website</span>
          <span className="text-text-primary"> in seconds</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-text-secondary text-lg md:text-xl max-w-2xl leading-relaxed mb-12"
          style={{ animation: 'fadeUp 0.5s ease 0.2s both' }}
        >
          Paste any URL and receive an AI-generated audit covering UX, SEO,
          performance, and conversion opportunities — with a prioritized fix list.
        </p>

        {/* ── URL Input ─────────────────────────────────── */}
        <div
          className="w-full max-w-2xl"
          style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}
        >
          <div className="relative group">
            {/* Glow ring on focus */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-signal/40 via-signal/20 to-signal/40 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />

            <div className="relative flex items-center bg-panel border border-border rounded-xl overflow-hidden">
              {/* Lock icon */}
              <div className="pl-4 pr-3 text-text-muted">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-5v-4m0 0V8m0 4h4m-4 0H8" />
                </svg>
              </div>

              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://yourwebsite.com"
                className="flex-1 bg-transparent py-4 pr-4 text-text-primary placeholder-text-muted font-mono text-sm outline-none"
                disabled={loading}
                autoFocus
              />

              <button
                onClick={handleAnalyze}
                disabled={loading || !url.trim()}
                className="m-2 px-6 py-3 bg-signal text-void font-display font-bold text-sm rounded-lg transition-all duration-200 hover:bg-signal-dim disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Run Audit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-bad text-sm font-mono text-left animate-fade-up">
              ⚠ {error}
            </p>
          )}

          {/* Loading state detail */}
          {loading && (
            <div className="mt-4 text-text-muted text-xs font-mono text-center space-y-1">
              <p className="animate-pulse">Scraping page structure...</p>
              <p className="text-text-muted/50 text-xs">This typically takes 15–45 seconds</p>
            </div>
          )}
        </div>

        {/* ── Trust signals ────────────────────────────── */}
        <div
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted font-mono"
          style={{ animation: 'fadeUp 0.5s ease 0.4s both' }}
        >
          {['UX Analysis', 'SEO Audit', 'Performance Scan', 'Conversion Review'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-signal/50" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Feature preview cards ────────────────────────── */}
      <div
        className="relative z-10 max-w-5xl mx-auto px-6 pb-24"
        style={{ animation: 'fadeUp 0.5s ease 0.5s both' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'UX Score', value: '84', grade: 'B', color: 'text-signal' },
            { label: 'SEO Score', value: '62', grade: 'C', color: 'text-warn' },
            { label: 'Performance', value: '91', grade: 'A', color: 'text-good' },
            { label: 'Conversion', value: '47', grade: 'D', color: 'text-bad' },
          ].map((card) => (
            <div
              key={card.label}
              className="panel p-4 text-center opacity-60 select-none"
            >
              <div className={`font-display font-bold text-3xl ${card.color}`}>
                {card.value}
              </div>
              <div className="text-text-muted text-xs font-mono mt-1">{card.label}</div>
              <div className={`text-xs font-mono mt-2 ${card.color}`}>Grade {card.grade}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-text-muted text-xs font-mono mt-4">
          ↑ Example report output — run your own audit above
        </p>
      </div>
    </main>
  );
}