// lib/geo.ts
// Generative Engine Optimization (GEO) Analyzer for SiteScope
// Analyzes how ChatGPT, Gemini, and other AI systems would represent / cite a brand.

import * as cheerio from "cheerio";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GEOSignals {
  // Brand Identity Clarity
  brandName: string;
  brandNameFrequency: number;
  hasClearTagline: boolean;
  hasAboutSection: boolean;
  hasFounderInfo: boolean;
  hasCompanyHistory: boolean;
  hasTeamPage: boolean;
  hasLinkedInOrg: boolean;

  // Trust & Authority Signals
  hasOrganizationSchema: boolean;
  hasPersonSchema: boolean;
  hasLocalBusinessSchema: boolean;
  hasSameAsLinks: boolean;
  sameAsCount: number;
  hasWikidataRef: boolean;
  hasWikipediaRef: boolean;
  hasCrunchbaseRef: boolean;
  hasPressOrNews: boolean;
  pressLinksCount: number;
  hasAwards: boolean;
  hasTestimonials: boolean;
  hasPartnerLogos: boolean;

  // Consistent Brand Messaging
  hasConsistentNAP: boolean; // Name, address, phone consistent across page
  hasContactInfo: boolean;
  hasPhoneNumber: boolean;
  hasEmailAddress: boolean;
  hasPhysicalAddress: boolean;
  hasBusinessHours: boolean;

  // Knowledge Panel Signals
  hasOrganizationLogo: boolean;
  hasSocialProfiles: boolean;
  socialProfilesCount: number;
  hasPriceRange: boolean;
  hasFoundingYear: boolean;
  hasEmployeeCount: boolean;
  hasIndustryCategory: boolean;

  // AI Discoverability
  hasClearValueProposition: boolean;
  hasProductDescriptions: boolean;
  hasUniqueSellingPoints: boolean;
  hasCaseStudies: boolean;
  hasStatistics: boolean;
  statisticsCount: number;
  hasQuotableStatements: boolean;
  hasExpertContent: boolean;

  // Citation Worthiness
  hasOriginalResearch: boolean;
  hasDataStudies: boolean;
  hasSurveyData: boolean;
  hasIndustryDefinitions: boolean;
  hasThoughtLeadership: boolean;
  inboundMentionIndicators: number;

  // Technical Discoverability
  hasCanonicalUrl: boolean;
  hasStructuredData: boolean;
  schemaTypesCount: number;
  hasOpenGraph: boolean;
  openGraphTitle: string;
  openGraphDescription: string;
  hasTwitterCard: boolean;
  hasMetaDescription: boolean;
  metaDescription: string;
  pageTitle: string;
}

export interface GEOCategory {
  name: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: GEOFinding[];
  opportunities: string[];
}

export interface GEOFinding {
  type: "pass" | "fail" | "warning";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

export interface GEOOpportunity {
  priority: number;
  title: string;
  description: string;
  estimatedImpact: "High" | "Medium" | "Low";
  effort: "Easy" | "Medium" | "Hard";
  category: string;
}

export interface GEOReport {
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  geoReadiness: "AI-Optimized" | "Needs Work" | "Not Optimized";
  aiMentionProbability: "High" | "Medium" | "Low";
  brandSummary: string; // Simulated short AI brand description
  summary: string;
  categories: {
    brandIdentity: GEOCategory;
    trustAuthority: GEOCategory;
    knowledgePanel: GEOCategory;
    aiDiscoverability: GEOCategory;
    citationWorthiness: GEOCategory;
  };
  topOpportunities: GEOOpportunity[];
  signals: GEOSignals;
  competitiveInsight: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const typeRegex = /"@type"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = typeRegex.exec(html)) !== null) {
    types.push(match[1]);
  }
  return [...new Set(types)];
}

function extractBrandName(
  $: cheerio.CheerioAPI,
  url: string
): string {
  // Try OG site_name first
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");
  if (ogSiteName) return ogSiteName.trim();

  // Try schema.org Organization name
  try {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const text = $(scripts[i]).html() || "";
      const parsed = JSON.parse(text);
      const schemas = Array.isArray(parsed) ? parsed : [parsed];
      for (const schema of schemas) {
        if (
          (schema["@type"] === "Organization" ||
            schema["@type"] === "LocalBusiness") &&
          schema.name
        ) {
          return schema.name;
        }
      }
    }
  } catch {}

  // Fallback: domain name
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return hostname.split(".")[0];
  } catch {
    return "Unknown";
  }
}

function countBrandNameOccurrences(text: string, brandName: string): number {
  if (!brandName || brandName === "Unknown") return 0;
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  return (text.match(regex) || []).length;
}

function generateBrandSummary(signals: GEOSignals, url: string): string {
  const domain = (() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  })();

  const brand = signals.brandName !== "Unknown" ? signals.brandName : domain;

  const parts: string[] = [];

  // Opening
  parts.push(`${brand} is`);

  // Industry / category
  if (signals.hasIndustryCategory) {
    parts.push("a business");
  } else {
    parts.push("an organization");
  }

  // Founded / established
  if (signals.hasFoundingYear) {
    parts.push("with a documented founding date");
  }

  // Authority indicators
  const authorityBits: string[] = [];
  if (signals.hasAwards) authorityBits.push("industry recognition");
  if (signals.hasPressOrNews) authorityBits.push("press coverage");
  if (signals.hasOriginalResearch || signals.hasDataStudies)
    authorityBits.push("original research");
  if (authorityBits.length > 0) {
    parts.push(`known for ${authorityBits.join(", ")}`);
  }

  // Trust score context
  if (signals.hasOrganizationSchema && signals.hasSameAsLinks) {
    parts.push("with structured brand data and external entity links");
  } else if (signals.hasOrganizationSchema) {
    parts.push("with basic structured brand data");
  } else {
    parts.push("but lacks structured brand data for AI systems");
  }

  const sentence = parts.join(" ") + ".";

  // Add what AI models would typically surface
  const surfaced: string[] = [];
  if (signals.hasContactInfo) surfaced.push("contact details");
  if (signals.socialProfilesCount > 1) surfaced.push("social profiles");
  if (signals.hasTestimonials) surfaced.push("customer reviews");
  if (surfaced.length > 0) {
    return `${sentence} AI models can surface its ${surfaced.join(", ")}.`;
  }

  return sentence;
}

// ─── Signal Extractor ─────────────────────────────────────────────────────────

export function extractGEOSignals(html: string, url: string): GEOSignals {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().toLowerCase();
  const rawHtml = html.toLowerCase();
  const allLinks = $("a[href]")
    .map((_, el) => $(el).attr("href") || "")
    .get();

  // ── Brand identity ────────────────────────────────────────────────────────
  const brandName = extractBrandName($, url);
  const brandNameFrequency = countBrandNameOccurrences(
    $("body").text(),
    brandName
  );

  const hasClearTagline =
    !!$('meta[name="description"]').attr("content") &&
    ($('meta[name="description"]').attr("content")?.length ?? 0) > 30;

  const aboutKeywords = /about\s*us|our\s*story|who\s*we\s*are|our\s*mission/i;
  const hasAboutSection =
    aboutKeywords.test(bodyText) || !!$('a[href*="about"]').length;

  const hasFounderInfo =
    /founder|co-founder|ceo|chief executive|started by/i.test(bodyText);
  const hasCompanyHistory =
    /founded|established|since \d{4}|history|our journey/i.test(bodyText);
  const hasTeamPage =
    !!$('a[href*="team"]').length ||
    !!$('a[href*="people"]').length ||
    /meet the team|our team/i.test(bodyText);
  const hasLinkedInOrg =
    allLinks.some((l) => /linkedin\.com\/company/i.test(l));

  // ── Trust & authority ─────────────────────────────────────────────────────
  const schemaTypes = extractSchemaTypes(html);
  const hasOrganizationSchema =
    schemaTypes.some((t) =>
      ["Organization", "LocalBusiness", "Corporation", "NGO"].includes(t)
    );
  const hasPersonSchema = schemaTypes.includes("Person");
  const hasLocalBusinessSchema = schemaTypes.includes("LocalBusiness");

  // sameAs links
  const sameAsMatches = [...html.matchAll(/"sameAs"\s*:\s*\[([^\]]+)\]/g)];
  const sameAsLinks =
    sameAsMatches
      .map((m) => m[1])
      .join(" ")
      .match(/"(https?:\/\/[^"]+)"/g) || [];
  const hasSameAsLinks = sameAsLinks.length > 0;
  const sameAsCount = sameAsLinks.length;

  const hasWikidataRef = rawHtml.includes("wikidata.org") || sameAsLinks.some((l) => l.includes("wikidata"));
  const hasWikipediaRef = rawHtml.includes("wikipedia.org") || sameAsLinks.some((l) => l.includes("wikipedia"));
  const hasCrunchbaseRef = rawHtml.includes("crunchbase.com") || sameAsLinks.some((l) => l.includes("crunchbase"));

  const pressKeywords =
    /press|news|media|in the news|featured in|as seen in|coverage/i;
  const hasPressOrNews =
    pressKeywords.test(bodyText) ||
    !!$('a[href*="press"]').length ||
    !!$('a[href*="news"]').length;
  const pressLinksCount = allLinks.filter((l) =>
    /press|news|media/i.test(l)
  ).length;

  const hasAwards =
    /award|winner|recognized|best|top \d+|nominated|prize/i.test(bodyText);
  const hasTestimonials =
    /testimonial|review|said|quote|customer|client/i.test(bodyText) ||
    schemaTypes.includes("Review") ||
    schemaTypes.includes("Testimonial");
  const hasPartnerLogos =
    /partner|integration|trusted by|works with|powered by/i.test(bodyText);

  // ── Consistent NAP ────────────────────────────────────────────────────────
  const hasPhoneNumber = /(\+?\d[\d\s\-().]{7,}\d)/.test(bodyText);
  const hasEmailAddress = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(
    bodyText
  );
  const hasPhysicalAddress =
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|blvd|lane|ln)/i.test(
      bodyText
    ) || !!schemaTypes.find((t) => ["PostalAddress"].includes(t));
  const hasBusinessHours =
    /business hours|open|monday|tuesday|am|pm|24\/7/i.test(bodyText);
  const hasContactInfo = hasPhoneNumber || hasEmailAddress || hasPhysicalAddress;
  const hasConsistentNAP = hasPhoneNumber && hasEmailAddress;

  // ── Knowledge panel signals ───────────────────────────────────────────────
  const hasOrganizationLogo =
    schemaTypes.includes("Organization") &&
    html.includes('"logo"');
  const socialDomains =
    /twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com|pinterest\.com/i;
  const socialLinks = allLinks.filter((l) => socialDomains.test(l));
  const hasSocialProfiles = socialLinks.length > 0;
  const socialProfilesCount = new Set(
    socialLinks.map((l) => {
      try {
        return new URL(l).hostname;
      } catch {
        return l;
      }
    })
  ).size;

  const hasPriceRange =
    /\$\d|\d+\.\d{2}|pricing|price|plan|subscription/i.test(bodyText) ||
    html.includes('"priceRange"');
  const hasFoundingYear =
    /founded\s+in\s+\d{4}|since\s+\d{4}|established\s+\d{4}|"foundingDate"/i.test(
      html
    );
  const hasEmployeeCount =
    /\d+\s+(employees|people|team members|staff)|"numberOfEmployees"/i.test(
      html
    );
  const hasIndustryCategory =
    html.includes('"industry"') ||
    schemaTypes.some((t) =>
      ["Store", "Service", "Product", "SoftwareApplication"].includes(t)
    );

  // ── AI discoverability ────────────────────────────────────────────────────
  const valuePropositionPhrases =
    /we help|our mission|we make|designed to|built for|the\s+(only|best|fastest|easiest)/i;
  const hasClearValueProposition = valuePropositionPhrases.test(bodyText);

  const hasProductDescriptions =
    schemaTypes.includes("Product") ||
    schemaTypes.includes("SoftwareApplication") ||
    /product|solution|service|platform/i.test(bodyText);
  const hasUniqueSellingPoints =
    /unique|only|first|patent|proprietary|exclusive|innovative/i.test(
      bodyText
    );
  const hasCaseStudies =
    /case study|case studies|success story|customer story/i.test(bodyText) ||
    !!$('a[href*="case-stud"]').length;

  // Statistics
  const statsMatches =
    bodyText.match(
      /\d+[\d,]*\s*(%|percent|users|customers|businesses|companies|countries|years)/g
    ) || [];
  const hasStatistics = statsMatches.length > 0;
  const statisticsCount = statsMatches.length;

  const hasQuotableStatements =
    /according to|research shows|studies show|data shows|report finds/i.test(
      bodyText
    );
  const hasExpertContent =
    schemaTypes.includes("Article") ||
    schemaTypes.includes("BlogPosting") ||
    /expert|guide|deep dive|comprehensive|ultimate guide/i.test(bodyText);

  // ── Citation worthiness ───────────────────────────────────────────────────
  const hasOriginalResearch =
    /original research|our research|we surveyed|we analyzed|our study/i.test(
      bodyText
    );
  const hasDataStudies =
    /report|whitepaper|study|analysis|survey|benchmark/i.test(bodyText);
  const hasSurveyData =
    /survey|respondents|participants|sample size/i.test(bodyText);
  const hasIndustryDefinitions =
    /what is|definition|defined as|refers to|glossary|terminology/i.test(
      bodyText
    );
  const hasThoughtLeadership =
    /thought leader|industry insight|trend|future of|prediction|forecast/i.test(
      bodyText
    );

  // Rough inbound mention indicator (outbound links to "via" or citation pages)
  const inboundMentionIndicators = allLinks.filter((l) =>
    /mention|cite|source|via|reference/i.test(l)
  ).length;

  // ── Technical discoverability ─────────────────────────────────────────────
  const hasCanonicalUrl = !!$('link[rel="canonical"]').attr("href");
  const hasStructuredData =
    !!$('script[type="application/ld+json"]').length ||
    !!$("[itemtype]").length;
  const hasOpenGraph = !!$('meta[property="og:title"]').length;
  const openGraphTitle =
    $('meta[property="og:title"]').attr("content") || "";
  const openGraphDescription =
    $('meta[property="og:description"]').attr("content") || "";
  const hasTwitterCard = !!$('meta[name="twitter:card"]').length;
  const hasMetaDescription = !!$('meta[name="description"]').attr("content");
  const metaDescription =
    $('meta[name="description"]').attr("content") || "";
  const pageTitle = $("title").text().trim();

  return {
    brandName,
    brandNameFrequency,
    hasClearTagline,
    hasAboutSection,
    hasFounderInfo,
    hasCompanyHistory,
    hasTeamPage,
    hasLinkedInOrg,
    hasOrganizationSchema,
    hasPersonSchema,
    hasLocalBusinessSchema,
    hasSameAsLinks,
    sameAsCount,
    hasWikidataRef,
    hasWikipediaRef,
    hasCrunchbaseRef,
    hasPressOrNews,
    pressLinksCount,
    hasAwards,
    hasTestimonials,
    hasPartnerLogos,
    hasConsistentNAP,
    hasContactInfo,
    hasPhoneNumber,
    hasEmailAddress,
    hasPhysicalAddress,
    hasBusinessHours,
    hasOrganizationLogo,
    hasSocialProfiles,
    socialProfilesCount,
    hasPriceRange,
    hasFoundingYear,
    hasEmployeeCount,
    hasIndustryCategory,
    hasClearValueProposition,
    hasProductDescriptions,
    hasUniqueSellingPoints,
    hasCaseStudies,
    hasStatistics,
    statisticsCount,
    hasQuotableStatements,
    hasExpertContent,
    hasOriginalResearch,
    hasDataStudies,
    hasSurveyData,
    hasIndustryDefinitions,
    hasThoughtLeadership,
    inboundMentionIndicators,
    hasCanonicalUrl,
    hasStructuredData,
    schemaTypesCount: schemaTypes.length,
    hasOpenGraph,
    openGraphTitle,
    openGraphDescription,
    hasTwitterCard,
    hasMetaDescription,
    metaDescription,
    pageTitle,
  };
}

// ─── Category Analyzers ───────────────────────────────────────────────────────

function analyzeBrandIdentity(s: GEOSignals): GEOCategory {
  const findings: GEOFinding[] = [];
  let score = 0;

  if (s.brandName && s.brandName !== "Unknown") {
    score += 15;
    findings.push({
      type: "pass",
      title: "Brand Name Detected",
      description: `"${s.brandName}" was identified from structured data or meta tags.`,
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "Brand Name Not Identifiable",
      description:
        "AI systems could not easily extract a clear brand name. Add og:site_name and Organization schema.",
      impact: "high",
    });
  }

  if (s.brandNameFrequency >= 5) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Consistent Brand Name Usage",
      description: `Brand name appears ${s.brandNameFrequency} times — consistent repetition helps AI models recognize the entity.`,
      impact: "medium",
    });
  } else if (s.brandNameFrequency > 0) {
    score += 5;
    findings.push({
      type: "warning",
      title: "Low Brand Name Frequency",
      description: `Brand name only appears ${s.brandNameFrequency} times. Increase to 5+ for stronger AI entity recognition.`,
      impact: "medium",
    });
  }

  if (s.hasClearTagline) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Clear Meta Description / Tagline",
      description:
        "A descriptive meta description was found — this is often used verbatim by AI summaries.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Clear Tagline",
      description:
        "Add a compelling meta description (100–160 chars). AI models use this when generating brand descriptions.",
      impact: "high",
    });
  }

  if (s.hasAboutSection) {
    score += 15;
    findings.push({
      type: "pass",
      title: "About / Company Section Present",
      description:
        "An About page or section was detected. AI models reference this when describing the company.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No About Section",
      description:
        "Create a clear About page with company overview, mission, and values.",
      impact: "high",
    });
  }

  if (s.hasFounderInfo) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Founder / Leadership Mentioned",
      description:
        "Founder or CEO information was found — humanizes the brand for AI entity graphs.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Founder Information",
      description:
        "Adding founder or leadership info improves entity completeness in AI knowledge bases.",
      impact: "medium",
    });
  }

  if (s.hasCompanyHistory) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Company History Present",
      description:
        "Founding year or company history detected — AI models factor this into brand credibility.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Company History",
      description: "Add founding year or origin story to strengthen brand entity data.",
      impact: "low",
    });
  }

  if (s.hasLinkedInOrg) {
    score += 10;
    findings.push({
      type: "pass",
      title: "LinkedIn Company Page Linked",
      description: "LinkedIn org link found — a key signal for professional credibility in AI systems.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No LinkedIn Company Link",
      description: "Link your official LinkedIn company page from the site footer or about page.",
      impact: "medium",
    });
  }

  if (s.hasTeamPage) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Team Page Present",
      description: "A team or people page helps AI models build a richer entity model of the organization.",
      impact: "low",
    });
  }

  score = Math.min(score, 100);
  return {
    name: "Brand Identity",
    score,
    grade: scoreToGrade(score),
    findings,
    opportunities: findings
      .filter((f) => f.type !== "pass")
      .map((f) => f.title),
  };
}

function analyzeTrustAuthority(s: GEOSignals): GEOCategory {
  const findings: GEOFinding[] = [];
  let score = 0;

  if (s.hasOrganizationSchema) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Organization Schema Present",
      description:
        "Organization or LocalBusiness schema found — the primary trust signal for AI brand understanding.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Organization Schema",
      description:
        "Add schema.org/Organization JSON-LD. This is the single most important GEO signal.",
      impact: "high",
    });
  }

  if (s.hasSameAsLinks) {
    score += 20;
    findings.push({
      type: "pass",
      title: `sameAs Links Present (${s.sameAsCount})`,
      description:
        "sameAs links connect your brand entity to external knowledge bases — critical for AI citation.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No sameAs Entity Links",
      description:
        'Add "sameAs" in Organization schema pointing to Wikipedia, Wikidata, Crunchbase, LinkedIn.',
      impact: "high",
    });
  }

  if (s.hasWikipediaRef) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Wikipedia Reference",
      description: "Wikipedia link found — strongest possible AI entity verification signal.",
      impact: "high",
    });
  }

  if (s.hasWikidataRef) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Wikidata Reference",
      description: "Wikidata link found — AI models like Gemini and ChatGPT heavily reference Wikidata.",
      impact: "high",
    });
  }

  if (s.hasCrunchbaseRef) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Crunchbase Reference",
      description: "Crunchbase link detected — key signal for startup and tech brand recognition.",
      impact: "medium",
    });
  }

  if (s.hasPressOrNews) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Press / News Coverage",
      description: "Press or news section found. Media coverage significantly increases AI citation probability.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Press Section",
      description:
        "Add a Press page with media mentions, coverage, and downloadable press kit.",
      impact: "medium",
    });
  }

  if (s.hasAwards) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Awards / Recognition",
      description: "Awards or industry recognition detected — differentiates brand in AI responses.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Awards or Recognition",
      description: "Highlight certifications, awards, or industry recognition to boost authority signals.",
      impact: "medium",
    });
  }

  if (s.hasTestimonials) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Testimonials / Reviews",
      description: "Customer testimonials or review schema found — adds credibility to brand representation.",
      impact: "low",
    });
  }

  if (s.hasPartnerLogos) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Partner / Integration Logos",
      description: "Partner mentions found — signals ecosystem and trust network to AI models.",
      impact: "low",
    });
  }

  score = Math.min(score, 100);
  return {
    name: "Trust & Authority",
    score,
    grade: scoreToGrade(score),
    findings,
    opportunities: findings
      .filter((f) => f.type !== "pass")
      .map((f) => f.title),
  };
}

function analyzeKnowledgePanel(s: GEOSignals): GEOCategory {
  const findings: GEOFinding[] = [];
  let score = 0;

  if (s.hasOrganizationLogo) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Logo in Organization Schema",
      description: "Schema logo found — displayed in Google Knowledge Panel and used by AI brand summarizers.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Logo in Schema",
      description: 'Add a "logo" property to your Organization schema with a direct image URL.',
      impact: "high",
    });
  }

  if (s.hasSocialProfiles && s.socialProfilesCount >= 3) {
    score += 20;
    findings.push({
      type: "pass",
      title: `${s.socialProfilesCount} Social Profiles Linked`,
      description: "Multiple social profiles found. These populate the Knowledge Panel social links.",
      impact: "high",
    });
  } else if (s.hasSocialProfiles) {
    score += 10;
    findings.push({
      type: "warning",
      title: `Only ${s.socialProfilesCount} Social Profile(s)`,
      description: "Link 3+ social profiles (LinkedIn, Twitter/X, Facebook, Instagram) for a complete Knowledge Panel.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Social Profiles Linked",
      description: "Add social media profile links to your site footer and Organization schema.",
      impact: "high",
    });
  }

  if (s.hasFoundingYear) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Founding Year Present",
      description: "Founding date detected — shown in Knowledge Panel and cited by AI in brand descriptions.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Founding Year",
      description: 'Add "foundingDate" to Organization schema and mention it in your About page.',
      impact: "medium",
    });
  }

  if (s.hasContactInfo) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Contact Information Present",
      description: "Phone, email, or address found — AI models surface this for local/business queries.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Contact Information",
      description: "Add phone number, email, or address — key for AI assistant responses to 'How do I contact X?'",
      impact: "medium",
    });
  }

  if (s.hasIndustryCategory) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Industry Category Defined",
      description: "Industry or business type was identifiable — helps AI correctly categorize the brand.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "Industry Not Clearly Defined",
      description: "Specify your industry in schema and page copy so AI can categorize your brand correctly.",
      impact: "medium",
    });
  }

  if (s.hasEmployeeCount) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Company Size Indicated",
      description: "Employee count or team size found — adds dimension to AI brand knowledge.",
      impact: "low",
    });
  }

  if (s.hasBusinessHours) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Business Hours Present",
      description: "Business hours detected — surfaced by AI assistants for location-based queries.",
      impact: "low",
    });
  }

  score = Math.min(score, 100);
  return {
    name: "Knowledge Panel",
    score,
    grade: scoreToGrade(score),
    findings,
    opportunities: findings
      .filter((f) => f.type !== "pass")
      .map((f) => f.title),
  };
}

function analyzeAIDiscoverability(s: GEOSignals): GEOCategory {
  const findings: GEOFinding[] = [];
  let score = 0;

  if (s.hasClearValueProposition) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Clear Value Proposition",
      description:
        "A clear mission or value statement was found — AI models use this to describe what the company does.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Clear Value Proposition",
      description:
        'Add a clear "We help X do Y" statement near the top of the page. This becomes the AI brand summary.',
      impact: "high",
    });
  }

  if (s.hasProductDescriptions) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Product / Service Descriptions",
      description: "Product or service content found — AI can accurately describe offerings in responses.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "Weak Product Descriptions",
      description: "Add descriptive product or service pages with schema markup to help AI describe your offerings.",
      impact: "medium",
    });
  }

  if (s.hasStatistics && s.statisticsCount >= 3) {
    score += 15;
    findings.push({
      type: "pass",
      title: `${s.statisticsCount} Statistics / Data Points Found`,
      description: "Data and statistics make content more citable by AI models when answering questions.",
      impact: "high",
    });
  } else if (s.hasStatistics) {
    score += 8;
    findings.push({
      type: "warning",
      title: "Few Statistics",
      description: "Add more data points (customer counts, success rates, growth numbers) for stronger AI citations.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Data / Statistics",
      description: "Include concrete numbers and metrics — AI models prioritize data-backed content in responses.",
      impact: "high",
    });
  }

  if (s.hasCaseStudies) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Case Studies Present",
      description: "Case studies found — AI models use these as evidence when recommending solutions.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Case Studies",
      description: "Add customer success stories. AI models reference case studies when comparing solutions.",
      impact: "medium",
    });
  }

  if (s.hasUniqueSellingPoints) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Unique Selling Points Highlighted",
      description: "Differentiators detected — AI models include these when comparing brands.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Unique Differentiators",
      description: 'Explicitly state what makes you different. Use phrases like "the only", "first", "patented".',
      impact: "medium",
    });
  }

  if (s.hasExpertContent) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Expert / Guide Content",
      description: "In-depth articles or guides found — AI models use authoritative content as source material.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Expert Content",
      description: "Publish comprehensive guides and thought-leadership articles to become an AI reference source.",
      impact: "medium",
    });
  }

  if (s.hasQuotableStatements) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Quotable Statements",
      description: '"Research shows" and "according to" phrasing found — increases likelihood of AI attribution.',
      impact: "low",
    });
  }

  score = Math.min(score, 100);
  return {
    name: "AI Discoverability",
    score,
    grade: scoreToGrade(score),
    findings,
    opportunities: findings
      .filter((f) => f.type !== "pass")
      .map((f) => f.title),
  };
}

function analyzeCitationWorthiness(s: GEOSignals): GEOCategory {
  const findings: GEOFinding[] = [];
  let score = 0;

  if (s.hasMetaDescription && s.metaDescription.length >= 100) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Strong Meta Description",
      description: "A detailed meta description provides AI with a ready-made brand summary to use.",
      impact: "high",
    });
  } else if (s.hasMetaDescription) {
    score += 7;
    findings.push({
      type: "warning",
      title: "Short Meta Description",
      description:
        "Meta description exists but is brief. Aim for 100–160 characters to maximize AI usage.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Meta Description",
      description: "Add a compelling meta description. This is the #1 most-used field by AI brand summarizers.",
      impact: "high",
    });
  }

  if (s.hasOriginalResearch) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Original Research Published",
      description: "Original research content detected — the strongest citation signal for AI training and responses.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Original Research",
      description: "Publish original studies, surveys, or data analyses. These are heavily cited by AI models.",
      impact: "high",
    });
  }

  if (s.hasDataStudies) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Reports / Whitepapers",
      description: "Reports or whitepapers found — AI systems cite these as authoritative sources.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Reports or Whitepapers",
      description: "Create downloadable reports or industry analyses to become a citable resource.",
      impact: "medium",
    });
  }

  if (s.hasIndustryDefinitions) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Industry Definitions / Glossary",
      description: '"What is" definitions and terminology found — frequently cited by AI in explanatory answers.',
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Industry Definitions",
      description: "Add glossary pages or definition sections. AI models cite these in informational responses.",
      impact: "medium",
    });
  }

  if (s.hasThoughtLeadership) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Thought Leadership Content",
      description: "Trend analysis and predictions found — AI models use forward-looking content in curated responses.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Thought Leadership",
      description: "Publish predictions, trend reports, or industry insights to become a cited authority.",
      impact: "medium",
    });
  }

  if (s.hasOpenGraph && s.openGraphDescription.length > 50) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Rich Open Graph Description",
      description: "OG description found — used by AI models when summarizing shared content.",
      impact: "medium",
    });
  } else if (!s.hasOpenGraph) {
    findings.push({
      type: "warning",
      title: "No Open Graph Tags",
      description: "Add og:title and og:description — used by AI assistants when processing shared URLs.",
      impact: "medium",
    });
  }

  if (s.hasSurveyData) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Survey Data Present",
      description: "Survey or respondent data found — highly citable in AI-generated industry overviews.",
      impact: "low",
    });
  }

  score = Math.min(score, 100);
  return {
    name: "Citation Worthiness",
    score,
    grade: scoreToGrade(score),
    findings,
    opportunities: findings
      .filter((f) => f.type !== "pass")
      .map((f) => f.title),
  };
}

// ─── Report Builder ───────────────────────────────────────────────────────────

export function buildGEOReport(signals: GEOSignals, url: string): GEOReport {
  const categories = {
    brandIdentity: analyzeBrandIdentity(signals),
    trustAuthority: analyzeTrustAuthority(signals),
    knowledgePanel: analyzeKnowledgePanel(signals),
    aiDiscoverability: analyzeAIDiscoverability(signals),
    citationWorthiness: analyzeCitationWorthiness(signals),
  };

  // Weighted overall score
  const overallScore = Math.round(
    categories.brandIdentity.score * 0.2 +
      categories.trustAuthority.score * 0.25 +
      categories.knowledgePanel.score * 0.2 +
      categories.aiDiscoverability.score * 0.2 +
      categories.citationWorthiness.score * 0.15
  );

  const overallGrade = scoreToGrade(overallScore);

  const geoReadiness: GEOReport["geoReadiness"] =
    overallScore >= 75
      ? "AI-Optimized"
      : overallScore >= 50
        ? "Needs Work"
        : "Not Optimized";

  const aiMentionProbability: GEOReport["aiMentionProbability"] =
    overallScore >= 70
      ? "High"
      : overallScore >= 45
        ? "Medium"
        : "Low";

  // Collect all opportunities across categories, sorted by category weight
  const allOpportunities: GEOOpportunity[] = [];

  const addOpportunities = (
    cat: GEOCategory,
    categoryName: string,
    weightMultiplier: number
  ) => {
    cat.findings
      .filter((f) => f.type !== "pass")
      .forEach((f, i) => {
        allOpportunities.push({
          priority:
            allOpportunities.length + 1 +
            (f.impact === "high" ? 0 : f.impact === "medium" ? 10 : 20) +
            i,
          title: f.title,
          description: f.description,
          estimatedImpact: f.impact === "high" ? "High" : f.impact === "medium" ? "Medium" : "Low",
          effort:
            f.impact === "high"
              ? "Medium"
              : f.impact === "medium"
                ? "Easy"
                : "Easy",
          category: categoryName,
        });
      });
  };

  addOpportunities(categories.trustAuthority, "Trust & Authority", 0.25);
  addOpportunities(categories.brandIdentity, "Brand Identity", 0.2);
  addOpportunities(categories.knowledgePanel, "Knowledge Panel", 0.2);
  addOpportunities(categories.aiDiscoverability, "AI Discoverability", 0.2);
  addOpportunities(categories.citationWorthiness, "Citation Worthiness", 0.15);

  allOpportunities.sort((a, b) => {
    const impactOrder = { High: 0, Medium: 1, Low: 2 };
    return impactOrder[a.estimatedImpact] - impactOrder[b.estimatedImpact];
  });

  allOpportunities.forEach((op, i) => {
    op.priority = i + 1;
  });

  const topOpportunities = allOpportunities.slice(0, 5);

  // Summary
  const weakCategories = Object.values(categories)
    .filter((c) => c.score < 60)
    .map((c) => c.name);

  const summary =
    weakCategories.length === 0
      ? `${signals.brandName} has strong AI brand representation across all dimensions. Focus on citation worthiness to maintain visibility.`
      : weakCategories.length <= 2
        ? `${signals.brandName} has a solid foundation but needs improvement in: ${weakCategories.join(", ")}. Address these to increase AI mention probability.`
        : `${signals.brandName} needs significant GEO work. Key gaps: ${weakCategories.join(", ")}. Start with Organization schema and sameAs entity links.`;

  const competitiveInsight =
    overallScore >= 75
      ? "This brand is likely appearing in AI responses for branded queries. Focus on citation worthiness to capture non-branded AI traffic."
      : overallScore >= 50
        ? "Competitors with better entity data, sameAs links, and original research will be cited more frequently in AI responses."
        : "Without Organization schema and entity links, AI models will often omit or misrepresent this brand. Foundational GEO work is urgently needed.";

  const brandSummary = generateBrandSummary(signals, url);

  return {
    overallScore,
    overallGrade,
    geoReadiness,
    aiMentionProbability,
    brandSummary,
    summary,
    categories,
    topOpportunities,
    signals,
    competitiveInsight,
  };
}
