# SiteScope by Plain & Pixel

> AI-powered website audit tool — instant UX, SEO, Performance & Conversion analysis

![SiteScope](https://img.shields.io/badge/SiteScope-v1.0-00d4ff?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)

---

## What is SiteScope?

SiteScope is a full-stack SaaS tool built by **Plain & Pixel** that gives any website an instant AI-generated audit. Paste a URL, get a detailed report covering:

- **UX** — layout, navigation, mobile friendliness, accessibility signals
- **SEO** — meta tags, headings, structured data, canonical URLs, robots
- **Performance** — Core Web Vitals via Google PageSpeed Insights API
- **Conversion** — CTAs, forms, trust signals, funnel friction

Reports include a prioritised fix list, letter grades, an executive summary, and a downloadable PDF.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| AI | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Performance Data | Google PageSpeed Insights API v5 |
| Database | Supabase (PostgreSQL) |
| Scraping | `fetch` + `cheerio` (no headless browser) |
| PDF Generation | `jsPDF` + `jspdf-autotable` |
| Styling | Tailwind CSS |
| Hosting | Vercel (Serverless) |
| Analytics | Vercel Analytics + Speed Insights |

---

## Architecture

```
User submits URL
      │
      ▼
POST /api/analyze
  ├─ Creates report row (status: PENDING)
  ├─ Returns reportId immediately (202)
  └─ Fires background pipeline via next/server after()
            │
            ├─ 1. Scrape page (fetch + cheerio) → status: SCRAPING
            └─ 2. Gemini AI audit → status: ANALYZING → COMPLETE

Report page loads
  ├─ Polls /api/report/:id every 3s until COMPLETE
  └─ PageSpeedPanel fetches /api/pagespeed independently (non-blocking)
            │
            └─ Mobile + desktop scores load in background (up to 5 min)
```

---

## Project Structure

```
sitescope/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts      # Main audit pipeline
│   │   ├── pagespeed/route.ts    # PageSpeed Insights endpoint
│   │   ├── report/[id]/route.ts  # Report status polling
│   │   ├── pdf/[id]/route.ts     # PDF generation + download
│   │   ├── contact/route.ts      # Contact form submissions
│   │   ├── health/route.ts       # System health check
│   │   └── debug/report/[id]/    # Debug + force-fail stuck reports
│   ├── report/[id]/page.tsx      # Report page (SSR + client polling)
│   └── page.tsx                  # Landing page
├── components/
│   ├── PageSpeedPanel.tsx        # Mobile/desktop scores widget
│   ├── ReportHeader.tsx          # Score gauge + executive summary
│   ├── CategoryCard.tsx          # Per-category findings
│   ├── TopFixes.tsx              # Priority fix list
│   ├── ScoreGauge.tsx            # Animated SVG score ring
│   ├── LighthouseMetrics.tsx     # Legacy metrics display
│   ├── ProcessingScreen.tsx      # Loading state with auto-refresh
│   └── ContactCTA.tsx            # Lead capture form
└── lib/
    ├── pagespeed.ts              # Google PageSpeed Insights API
    ├── ai.ts                     # Gemini AI audit generation
    ├── scraper.ts                # HTTP page scraper
    ├── supabase.ts               # Lazy Supabase client
    └── pdf.ts                    # PDF report generation
```

---

## Environment Variables

Create a `.env.local` file at the root with the following:

```env
# Supabase — https://supabase.com
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI — https://aistudio.google.com
GEMINI_API_KEY=AIzaSy...

# Google PageSpeed Insights API — https://console.cloud.google.com
# Optional but strongly recommended — without it you share the free 25k/day quota
PAGESPEED_API_KEY=AIzaSy...
```

---

## Supabase Schema

Run this SQL in your Supabase project to create the required tables:

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  status text not null default 'PENDING',
  error_msg text,
  scraped_data jsonb,
  lighthouse_data jsonb,
  audit_result jsonb,
  overall_score integer,
  created_at timestamptz default now()
);

create table contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  website text,
  message text,
  report_id uuid references reports(id),
  created_at timestamptz default now()
);
```

---

## Getting Started (Local Development)

```bash
# 1. Clone the repo
git clone https://github.com/Devansh-46/sitescope.git
cd sitescope

# 2. Install dependencies
npm install

# 3. Add environment variables
cp .env.example .env.local
# Fill in your keys

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | `POST` | Start a new audit. Body: `{ url }` |
| `/api/report/:id` | `GET` | Poll report status + data |
| `/api/pagespeed` | `POST` | Run PageSpeed Insights. Body: `{ url }` |
| `/api/pagespeed?url=` | `GET` | Same, browser-testable |
| `/api/pdf/:id` | `GET` | Download PDF report |
| `/api/contact` | `POST` | Submit contact form |
| `/api/health` | `GET` | Check env vars, DB, and AI connectivity |
| `/api/debug/report/:id` | `GET` | Debug a stuck report |
| `/api/debug/report/:id` | `DELETE` | Force-fail a stuck report |

---

## Deployment

This project is deployed on **Vercel**. To deploy your own instance:

1. Fork this repo
2. Import into [vercel.com](https://vercel.com)
3. Add the environment variables above in Vercel → Settings → Environment Variables
4. Deploy

The `maxDuration` for each route is configured at the function level — `analyze` runs for up to 60s, `pagespeed` for up to 300s.

---

## Health Check

Visit `/api/health` on your deployed instance to verify all services are connected:

```json
{
  "status": "ok",
  "checks": {
    "SUPABASE_URL": "✅ set",
    "SUPABASE_SERVICE_KEY": "✅ set",
    "GEMINI_API_KEY": "✅ set",
    "database": "✅ connected",
    "gemini_ai": "✅ connected (response: \"OK\")",
    "stuck_reports": "✅ none"
  }
}
```

---

## Built by Plain & Pixel

- Website: [plainnpixel.tech](https://plainnpixel.tech)
- Email: [plain.n.pixel@gmail.com](mailto:plain.n.pixel@gmail.com)

---

*SiteScope is a product of Plain & Pixel. All rights reserved.*
