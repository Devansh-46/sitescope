// app/layout.tsx
import type { Metadata } from 'next';
import { Syne, Space_Mono, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

// Display font — geometric, distinctive
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

// Monospace — for data, scores, metrics
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
  display: 'swap',
});

// Body — clean, readable
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SiteScope by Plain & Pixel — AI Website Audit',
  description:
    'Instant AI-powered analysis of your website\'s UX, SEO, performance, and conversion opportunities.',
  keywords: 'website audit, SEO analysis, performance, UX analysis, conversion optimization',
  openGraph: {
    title: 'SiteScope by Plain & Pixel — AI Website Audit',
    description: 'Instant AI-powered website analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${spaceMono.variable} ${dmSans.variable} font-body bg-void text-text-primary antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
