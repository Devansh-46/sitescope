// lib/scraper.ts
// Puppeteer-based page scraper — extracts all SEO and content signals
// Uses @sparticuz/chromium-min on Vercel, local Chrome in dev

import puppeteer, { Browser, Page } from 'puppeteer-core';
import * as fs from 'fs';

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

// ── Chromium binary URL for @sparticuz/chromium-min ──────────
// Pin to a specific version that matches puppeteer-core@22
const CHROMIUM_REMOTE_EXECUTABLE_PATH =
  'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar';

// ── Cross-platform Chrome path detection (local dev only) ────
function getLocalChromePath(): string {
  const platform = process.platform;
  const candidates: string[] = [];

  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    );
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[Scraper] Using local Chrome at: ${p}`);
      return p;
    }
  }

  throw new Error(
    `Chrome not found. Please install Google Chrome.\nSearched:\n${candidates.join('\n')}`
  );
}

// ── Main scrape function ──────────────────────────────────────
export async function scrapePage(url: string): Promise<ScrapedPageData> {
  let browser: Browser | null = null;

  try {
    const isServerless =
      process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    let executablePath: string;
    let launchArgs: string[];

    if (isServerless) {
      // Use chromium-min — downloads binary from GitHub at runtime
      // This keeps the function bundle well under Vercel's 50MB limit
      const chromium = (await import('@sparticuz/chromium-min')).default;
      executablePath = await chromium.executablePath(CHROMIUM_REMOTE_EXECUTABLE_PATH);
      launchArgs = chromium.args;
      console.log('[Scraper] Serverless mode — using @sparticuz/chromium-min');
    } else {
      executablePath = getLocalChromePath();
      launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
      ];
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: launchArgs,
    });

    const page: Page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Block images/fonts/css to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const pageLoadTime = Date.now() - startTime;
    const finalUrl = page.url();

    const data = await page.evaluate(() => {
      const getMeta = (name: string): string =>
        (document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement)?.content?.trim() ?? '';
      const getProperty = (property: string): string =>
        (document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement)?.content?.trim() ?? '';

      const h1Tags = Array.from(document.querySelectorAll('h1')).map((el) => el.textContent?.trim() ?? '');
      const h2Tags = Array.from(document.querySelectorAll('h2')).map((el) => el.textContent?.trim() ?? '');
      const h3Tags = Array.from(document.querySelectorAll('h3')).map((el) => el.textContent?.trim() ?? '');

      const allImages = Array.from(document.querySelectorAll('img'));
      const imagesMissingAlt = allImages.filter((img) => !img.alt || img.alt.trim() === '').length;

      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const origin = window.location.origin;
      const internalLinks = allLinks
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith(origin))
        .slice(0, 50);
      const externalLinks = allLinks
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http') && !href.startsWith(origin))
        .slice(0, 30);

      const bodyText = document.body.innerText ?? '';
      const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 1).length;

      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      const robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
      const viewport = document.querySelector('meta[name="viewport"]');
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');

      const buttons = Array.from(
        document.querySelectorAll('button, a.btn, .cta, [class*="cta"], [class*="button"]')
      )
        .map((el) => el.textContent?.trim() ?? '')
        .filter((text) => text.length > 0 && text.length < 100)
        .slice(0, 10);

      return {
        title: document.title?.trim() ?? '',
        metaDescription: getMeta('description'),
        metaKeywords: getMeta('keywords'),
        ogTitle: getProperty('og:title'),
        ogDescription: getProperty('og:description'),
        ogImage: getProperty('og:image'),
        h1Tags, h2Tags, h3Tags,
        imagesTotal: allImages.length,
        imagesMissingAlt,
        internalLinks, externalLinks,
        wordCount,
        hasCanonical: !!canonical,
        canonicalUrl: canonical?.href ?? '',
        hasRobotsMeta: !!robotsMeta,
        robotsContent: robotsMeta?.content ?? '',
        hasViewport: !!viewport,
        hasStructuredData: structuredData.length > 0,
        ctaButtons: buttons,
        formCount: document.querySelectorAll('form').length,
      };
    });

    return { url, finalUrl, pageLoadTime, ...data };

  } finally {
    if (browser) await browser.close();
  }
}
