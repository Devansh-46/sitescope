// components/ReportHeader.tsx
// Top section of the report page — URL info, overall score, PDF download
'use client';

import { useState } from 'react';
import ScoreGauge from './ScoreGauge';

interface ReportHeaderProps {
  url: string;
  domain: string;
  overallScore: number;
  grade: string;
  executiveSummary: string;
  createdAt: string;
  reportId: string;
}

export default function ReportHeader({
  url,
  domain,
  overallScore,
  grade,
  executiveSummary,
  createdAt,
  reportId,
}: ReportHeaderProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/pdf/${reportId}`);
      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `sitescope-${domain}-report.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-signal/40 to-transparent" />

      <div className="relative p-6 md:p-10">
        {/* ── Top bar: URL + actions ─────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted mb-2">
              <a href="/" className="hover:text-signal transition-colors">SiteScope</a>
              <span>›</span>
              <span>Audit Report</span>
            </div>

            {/* Domain */}
            <h1 className="font-display font-bold text-2xl md:text-3xl text-text-primary">
              {domain}
            </h1>

            {/* Full URL */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted text-sm font-mono hover:text-signal transition-colors mt-1 flex items-center gap-1"
            >
              {url.length > 60 ? `${url.slice(0, 57)}...` : url}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-surface hover:border-signal/30 hover:bg-signal/5 rounded-lg text-sm font-body text-text-primary transition-all duration-200 disabled:opacity-50"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>

            {/* New audit */}
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 bg-signal text-void font-display font-bold text-sm rounded-lg hover:bg-signal-dim transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Audit
            </a>
          </div>
        </div>

        {/* ── Score + Summary ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Gauge */}
          <div className="flex justify-center md:justify-start">
            <ScoreGauge score={overallScore} grade={grade} size={200} />
          </div>

          {/* Executive summary */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
                Executive Summary
              </span>
            </div>
            <p className="text-text-secondary text-base leading-relaxed">
              {executiveSummary}
            </p>

            {/* Metadata */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Powered by Claude AI
              </span>
              <span className="px-2 py-0.5 rounded border border-border bg-surface text-text-muted">
                ID: {reportId.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
