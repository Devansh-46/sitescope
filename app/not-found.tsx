// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="text-center">
        <div className="font-display font-bold text-8xl text-signal/20 mb-4">404</div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">
          Report not found
        </h1>
        <p className="text-text-muted mb-6">
          This report may have expired or the link is incorrect.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-signal text-void font-display font-bold rounded-lg hover:bg-signal-dim transition-all"
        >
          Run a New Audit
        </a>
      </div>
    </div>
  );
}
