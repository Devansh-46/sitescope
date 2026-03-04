# SiteScope — AI-Powered Website Audit Tool

> Instant AI-generated audits covering UX, SEO, performance, and conversion optimization.

![SiteScope](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Claude](https://img.shields.io/badge/Claude-Sonnet-orange?style=flat-square)

---

## 📦 Project Structure

```
sitescope/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Landing page with URL input
│   ├── globals.css             # Global styles + animations
│   ├── not-found.tsx           # 404 page
│   ├── report/
│   │   └── [id]/
│   │       └── page.tsx        # Report dashboard (server component)
│   └── api/
│       ├── analyze/
│       │   └── route.ts        # POST — orchestrates full analysis
│       ├── report/
│       │   └── [id]/
│       │       └── route.ts    # GET — fetch report by ID
│       ├── pdf/
│       │   └── [id]/
│       │       └── route.ts    # GET — download PDF report
│       └── contact/
│           └── route.ts        # POST — contact form submission
│
├── components/
│   ├── ReportHeader.tsx        # Overall score + metadata
│   ├── ScoreGauge.tsx          # Animated SVG score ring
│   ├── CategoryCard.tsx        # UX/SEO/Performance/Conversion card
│   ├── TopFixes.tsx            # Prioritized fix list
│   ├── LighthouseMetrics.tsx   # Lighthouse scores display
│   └── ContactCTA.tsx          # "Fix my site" CTA + form
│
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── scraper.ts              # Puppeteer page scraper
│   ├── lighthouse.ts           # Lighthouse performance runner
│   ├── ai.ts                   # Claude AI audit generator
│   └── pdf.ts                  # PDF report generator (jsPDF)
│
├── prisma/
│   └── schema.prisma           # DB schema (Report, ContactSubmission)
│
├── .env.example                # Example environment variables
├── vercel.json                 # Vercel deployment config
├── next.config.js              # Next.js config
├── tailwind.config.js          # Tailwind + custom design tokens
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key
- Chrome/Chromium installed locally (for Puppeteer)

### 1. Clone and Install

```bash
git clone https://github.com/yourname/sitescope.git
cd sitescope
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/sitescope"
ANTHROPIC_API_KEY="sk-ant-your-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production-safe)
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — paste any URL and run your first audit.

---

## 🔄 Core Analysis Flow

```
User Input (URL)
      │
      ▼
POST /api/analyze
      │
      ├─► 1. Validate URL (Zod)
      │
      ├─► 2. Create DB record (status: PENDING)
      │
      ├─► 3. scrapePage() — Puppeteer
      │       ├── Title, meta tags, OG data
      │       ├── H1/H2/H3 structure
      │       ├── Images + alt tag audit
      │       ├── Internal/external links
      │       ├── Word count
      │       ├── CTA buttons detected
      │       └── Technical SEO signals
      │
      ├─► 4. runLighthouse() — Google Lighthouse
      │       ├── Performance score
      │       ├── Accessibility score
      │       ├── Best Practices score
      │       ├── SEO score
      │       ├── Core Web Vitals metrics
      │       └── Performance opportunities
      │
      ├─► 5. generateAuditReport() — Claude AI
      │       ├── UX Analysis (4-6 findings)
      │       ├── SEO Analysis (4-6 findings)
      │       ├── Performance Analysis (4-6 findings)
      │       ├── Conversion Analysis (4-6 findings)
      │       ├── Overall score + grade
      │       ├── Executive summary
      │       └── Top 5 prioritized fixes
      │
      ├─► 6. Save complete report to DB
      │
      └─► 7. Return { reportId } → redirect to /report/:id
```

---

## 🤖 AI Prompt Design

The AI prompt in `lib/ai.ts` is engineered to produce structured, actionable JSON output:

- **All scraped data** is passed as structured text (not raw HTML)
- **Lighthouse scores** are included for cross-referencing
- **Clear scoring guide** (A–F grading) ensures consistency
- **JSON-only response** instruction prevents prose wrapper
- **Impact-ranked findings** (critical → warning → info → good)
- **Specific fix instructions** reference actual site data where possible

The prompt template is in `buildAuditPrompt()` — easy to customize for different analysis priorities.

---

## 🗄️ Database Schema

```sql
-- Reports table
Report {
  id            String   @id (cuid)
  url           String
  domain        String
  scrapedData   Json?    -- Raw Puppeteer output
  lighthouseData Json?   -- Raw Lighthouse output
  auditResult   Json?    -- AI-generated AuditReport
  overallScore  Int?     -- Cached for quick queries
  status        Enum     -- PENDING|SCRAPING|ANALYZING|COMPLETE|FAILED
  errorMsg      String?
  createdAt     DateTime
  updatedAt     DateTime
}

-- Contact form submissions
ContactSubmission {
  id        String @id (cuid)
  name      String
  email     String
  website   String?
  message   String?
  reportId  String?  -- Links to the report that prompted contact
  createdAt DateTime
}
```

---

## 🚢 Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

### 2. Set Environment Variables

```bash
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

### 3. Deploy

```bash
vercel --prod
```

### 4. Run Database Migration

```bash
# After deployment, run migration against production DB
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### Important Vercel Notes

- **Hobby plan**: Functions timeout at 10s — upgrade to Pro for 60s timeout
- **Puppeteer on Vercel**: Requires `chrome-aws-lambda` + `puppeteer-core` (already in dependencies)
- **Lighthouse on Vercel**: May be slow on cold starts — consider caching or async processing

#### Puppeteer for Production (Vercel)

Replace the Puppeteer launch call in `lib/scraper.ts`:

```typescript
// For Vercel deployment — replace the launch() call with:
import chromium from 'chrome-aws-lambda';

browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath,
  headless: chromium.headless,
});
```

---

## 🔧 Customization Guide

### Add More Analysis Categories

In `lib/ai.ts`, extend the `AuditReport.sections` type and update the prompt template to include your new section.

### Swap AI Provider

Replace the Anthropic client in `lib/ai.ts` with OpenAI:

```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
});
```

### Add Email Notifications

In `app/api/contact/route.ts`, uncomment and configure the email section using [Resend](https://resend.com):

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'SiteScope <noreply@yourdomain.com>',
  to: process.env.CONTACT_EMAIL,
  subject: `New contact from ${name}`,
  html: `<p>${message}</p>`,
});
```

### Rate Limiting

Add request rate limiting with Upstash Redis in `app/api/analyze/route.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 audits/hour/IP
});
```

---

## 🧪 Testing

```bash
# Test the analysis API directly
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Fetch a report
curl http://localhost:3000/api/report/REPORT_ID

# Download PDF
curl -O http://localhost:3000/api/pdf/REPORT_ID
```

---

## 📈 Scaling Considerations

For production scale:

1. **Async Processing**: Move analysis to a background job queue (e.g., BullMQ + Redis) — return a `reportId` immediately and poll for completion
2. **Caching**: Cache Lighthouse results for the same URL within 24 hours
3. **CDN**: Store PDF reports in S3/R2 instead of generating on-demand
4. **Rate Limiting**: Implement per-IP and per-user limits before public launch
5. **Prisma Connection Pooling**: Use PgBouncer or Prisma Accelerate for serverless

---

## 📄 License

MIT — build something great with it.
#   s i t e s c o p e  
 