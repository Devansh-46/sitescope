// lib/scraper.ts
// HTTP-based page scraper — extracts all SEO and content signals
// Uses native fetch + cheerio for HTML parsing (no browser needed)
// Works perfectly on Vercel serverless — no Chromium, no system library issues

import * as cheerio from 'cheerio';

export interface ScrapedPageData {
  url: string;
  finalUrl: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  imagesTotal: number;
  imagesMissingAlt: number;
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  hasCanonical: boolean;
  canonicalUrl: string;
  hasRobotsMeta: boolean;
  robotsContent: string;
  hasViewport: boolean;
  hasStructuredData: boolean;
  ctaButtons: string[];
  formCount: number;
  pageLoadTime: number;
}

export async function scrapePage(url: string): Promise<ScrapedPageData> {
  const startTime = Date.now();

  // Normalise URL
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
  });

  const pageLoadTime = Date.now() - startTime;
  const finalUrl = response.url;
  const html = await response.text();

  const $ = cheerio.load(html);

  // ── Meta helpers ─────────────────────────────────────────
  const getMeta = (name: string) =>
    $(`meta[name="${name}"]`).attr('content')?.trim() ?? '';
  const getProperty = (prop: string) =>
    $(`meta[property="${prop}"]`).attr('content')?.trim() ?? '';

  // ── Headings ─────────────────────────────────────────────
  const h1Tags = $('h1')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2Tags = $('h2')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);
  const h3Tags = $('h3')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);

  // ── Images ───────────────────────────────────────────────
  const allImages = $('img').toArray();
  const imagesMissingAlt = allImages.filter(
    (img) => !$(img).attr('alt')?.trim()
  ).length;

  // ── Links ────────────────────────────────────────────────
  const origin = new URL(finalUrl).origin;
  const allLinks = $('a[href]').toArray();

  const internalLinks = allLinks
    .map((a) => {
      const href = $(a).attr('href') ?? '';
      try {
        return new URL(href, finalUrl).href;
      } catch {
        return '';
      }
    })
    .filter((href) => href.startsWith(origin))
    .slice(0, 50);

  const externalLinks = allLinks
    .map((a) => {
      const href = $(a).attr('href') ?? '';
      try {
        return new URL(href, finalUrl).href;
      } catch {
        return '';
      }
    })
    .filter((href) => href.startsWith('http') && !href.startsWith(origin))
    .slice(0, 30);

  // ── Word count (body text) ────────────────────────────────
  // Remove scripts/styles before counting
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter((w) => w.length > 1).length;

  // ── Technical SEO ────────────────────────────────────────
  const canonicalEl = $('link[rel="canonical"]');
  const hasCanonical = canonicalEl.length > 0;
  const canonicalUrl = canonicalEl.attr('href') ?? '';

  const robotsMeta = $('meta[name="robots"]');
  const hasRobotsMeta = robotsMeta.length > 0;
  const robotsContent = robotsMeta.attr('content') ?? '';

  const hasViewport = $('meta[name="viewport"]').length > 0;
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;

  // ── CTA Buttons ──────────────────────────────────────────
  const ctaButtons = $(
    'button, a.btn, .cta, [class*="cta"], [class*="button"]'
  )
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 0 && text.length < 100)
    .slice(0, 10);

  const formCount = $('form').length;

  console.log(`[Scraper] Scraped ${finalUrl} in ${pageLoadTime}ms via HTTP fetch`);

  return {
    url: targetUrl,
    finalUrl,
    pageLoadTime,
    title: $('title').text().trim(),
    metaDescription: getMeta('description'),
    metaKeywords: getMeta('keywords'),
    ogTitle: getProperty('og:title'),
    ogDescription: getProperty('og:description'),
    ogImage: getProperty('og:image'),
    h1Tags,
    h2Tags,
    h3Tags,
    imagesTotal: allImages.length,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    wordCount,
    hasCanonical,
    canonicalUrl,
    hasRobotsMeta,
    robotsContent,
    hasViewport,
    hasStructuredData,
    ctaButtons,
    formCount,
  };
}
