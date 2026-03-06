// components/ContactCTA.tsx
// "Want us to fix these issues?" CTA section with inline contact form
'use client';

import { useState } from 'react';

interface ContactCTAProps {
  reportId?: string;
  domain?: string;
}

export default function ContactCTA({ reportId, domain }: ContactCTAProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: domain ? `https://${domain}` : '',
    message: `I'd like help fixing the issues found on ${domain ?? 'my website'}.`,
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in your name and email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Log to local database
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, reportId }),
      });

      // 2. Send email via FormSubmit.co (AJAX)
      const formSubmitData = {
        ...formData,
        reportId,
        _subject: `New Expert Report Request: ${formData.name}`,
      };

      const res = await fetch('https://formsubmit.co/ajax/plain.n.pixel@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSubmitData),
      });

      if (!res.ok) {
        throw new Error('Form submission failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-signal/20"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(8,13,20,0.95) 100%)',
        animation: 'fadeUp 0.5s ease 600ms both',
      }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-signal/5 -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-signal/3 translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

      <div className="relative p-8 md:p-10">
        {!formOpen && !success ? (
          /* ── CTA Banner ────────────────────────────── */
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-signal mb-3 border border-signal/20 bg-signal/5 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                EXPERT TEAM AVAILABLE
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-text-primary mb-2">
                Want us to fix these issues?
              </h2>
              <p className="text-text-secondary text-base max-w-lg">
                Our team of SEO and performance specialists can implement every fix in
                this report — guaranteed results within 14 days.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <button
                onClick={() => setFormOpen(true)}
                className="px-8 py-4 bg-signal text-void font-display font-bold text-base rounded-xl hover:bg-signal-dim transition-all duration-200 shadow-lg shadow-signal/20 hover:shadow-signal/30 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                Get Reports from Experts
              </button>
              <p className="text-text-muted text-xs text-center font-mono">
                No obligation · Response within 24h
              </p>
            </div>
          </div>
        ) : success ? (
          /* ── Success State ─────────────────────────── */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-good/10 border border-good/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-good" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-xl text-text-primary mb-2">
              Message received!
            </h3>
            <p className="text-text-secondary">
              We'll review your audit and reach out with your expert report within 24 hours.
            </p>
          </div>
        ) : (
          /* ── Contact Form ──────────────────────────── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-xl text-text-primary">
                Get Reports from Experts
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Jane Smith' },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'jane@company.com' },
                { key: 'website', label: 'Website', type: 'url', placeholder: 'https://yoursite.com' },
              ].map((field) => (
                <div key={field.key} className={field.key === 'website' ? 'md:col-span-2' : ''}>
                  <label className="block text-text-muted text-xs font-mono mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary text-sm font-body outline-none focus:border-signal/50 transition-colors placeholder-text-muted"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="block text-text-muted text-xs font-mono mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, message: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary text-sm font-body outline-none focus:border-signal/50 transition-colors placeholder-text-muted resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-bad text-sm font-mono">⚠ {error}</p>
            )}

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-signal text-void font-display font-bold rounded-lg hover:bg-signal-dim transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                ) : null}
                {loading ? 'Sending...' : 'Send Message'}
              </button>
              <p className="text-text-muted text-xs font-mono">
                We respond within 24 hours
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
