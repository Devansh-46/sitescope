// app/report/[id]/page.tsx
import { notFound } from 'next/navigation';
import type { AuditReport } from '@/lib/ai';
import type { LighthouseScores } from '@/lib/lighthouse';
import ReportHeader from '@/components/ReportHeader';
import CategoryCard from '@/components/CategoryCard';
import TopFixes from '@/components/TopFixes';
import ContactCTA from '@/components/ContactCTA';
import LighthouseMetrics from '@/components/LighthouseMetrics';
import ProcessingScreen from '@/components/ProcessingScreen';

export default async function ReportPage({ params }: { params: { id: string } }) {
  const id = params.id;

  // Lazy import supabase — prevents env var crashes during SSR module init
  const { supabase } = await import('@/lib/supabase');

  const { data: report, error } = await supabase
    .from('reports')
    .select('id, url, domain, overall_score, status, error_msg, audit_result, lighthouse_data, created_at')
    .eq('id', id)
    .single();

  // Log actual error for debugging — don't silently 404
  if (error) {
    console.error('[ReportPage] Supabase error:', error.code, error.message);
    // PGRST116 = "no rows returned" — means report doesn't exist yet or wrong ID
    if (error.code === 'PGRST116') {
      notFound();
    }
    // Other DB errors — show a message instead of 404
    return <ErrorScreen message={`Database error: ${error.message}`} />;
  }

  if (!report) notFound();

  // Still processing — show spinner with auto-refresh
  if (['PENDING', 'SCRAPING', 'ANALYZING'].includes(report.status)) {
    return <ProcessingScreen url={report.url} status={report.status} />;
  }

  // Analysis failed
  if (report.status === 'FAILED') {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center panel p-8">
          <div className="w-16 h-16 rounded-full bg-bad/10 border border-bad/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-bad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary mb-2">Analysis Failed</h1>
          <p className="text-text-secondary text-sm mb-2">
            We couldn&apos;t analyze <span className="font-mono text-text-primary">{report.url}</span>
          </p>
          <p className="text-bad text-xs font-mono mb-6">{report.error_msg ?? 'Unknown error'}</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-signal text-void font-display font-bold rounded-lg hover:bg-signal-dim transition-all">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Completed — render full report
  const audit = report.audit_result as unknown as AuditReport;
  const lighthouse = report.lighthouse_data as unknown as LighthouseScores | null;

  // audit_result missing even though status=COMPLETE — shouldn't happen but guard it
  if (!audit) {
    return <ErrorScreen message="Report data is incomplete. Please run the audit again." />;
  }

  return (
    <div className="min-h-screen bg-void">
      <nav className="border-b border-border bg-panel/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="text-text-primary">Site</span>
            <span className="text-signal">Scope</span>
          </a>
          <span className="text-xs font-mono text-text-muted border border-border px-3 py-1 rounded-full">
            AUDIT COMPLETE
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <div className="panel">
          <ReportHeader
            url={report.url}
            domain={report.domain}
            overallScore={audit.overallScore}
            grade={audit.grade}
            executiveSummary={audit.executiveSummary}
            createdAt={report.created_at}
            reportId={report.id}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopFixes fixes={audit.topFixes} />
          {lighthouse && <LighthouseMetrics data={lighthouse} />}
        </div>

        <div>
          <h2 className="font-display font-bold text-xl text-text-primary mb-5 flex items-center gap-2">
            <span className="w-1 h-5 bg-signal rounded-full" />
            Detailed Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.entries(audit.sections) as [string, typeof audit.sections.UX][]).map(
              ([name, section], i) => (
                <CategoryCard key={name} name={name} section={section} delay={i * 100} />
              )
            )}
          </div>
        </div>

        <ContactCTA reportId={report.id} domain={report.domain} />

        <footer className="text-center py-6 text-text-muted text-xs font-mono border-t border-border">
          SiteScope — AI-powered website audit ·{' '}
          <a href="/" className="hover:text-signal transition-colors">Run another audit →</a>
        </footer>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center panel p-8">
        <div className="w-16 h-16 rounded-full bg-warn/10 border border-warn/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-xl text-text-primary mb-2">Something went wrong</h1>
        <p className="text-text-secondary text-sm mb-6">{message}</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-signal text-void font-display font-bold rounded-lg hover:bg-signal-dim transition-all">
          Try Again
        </a>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
