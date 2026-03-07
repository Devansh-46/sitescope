// lib/aeo.ts
// Answer Engine Optimization (AEO) Analyzer for SiteScope

import * as cheerio from "cheerio";

export interface AEOSignals {
  // Structured Data
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  hasFAQSchema: boolean;
  hasHowToSchema: boolean;
  hasArticleSchema: boolean;
  hasProductSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasReviewSchema: boolean;

  // Content Structure
  hasDefinitionBlocks: boolean;
  hasFAQSection: boolean;
  hasOrderedLists: boolean;
  hasTableData: boolean;
  hasSummaryBoxes: boolean;
  questionHeadingsCount: number;
  questionHeadings: string[];

  // Entity & Authority Signals
  hasAuthorInfo: boolean;
  hasPublishDate: boolean;
  hasOrganizationInfo: boolean;
  hasCitations: boolean;
  hasExternalLinks: boolean;
  externalLinksCount: number;

  // Featured Snippet Optimization
  hasDirectAnswers: boolean;
  avgParagraphLength: number;
  hasNumberedSteps: boolean;
  hasDefinitionLists: boolean;
  conciseAnswersCount: number;

  // Conversational & NLP Signals
  hasNaturalLanguageQuestions: boolean;
  titleIsQuestion: boolean;
  hasWhatIsSection: boolean;
  hasHowToSection: boolean;
  readabilityScore: number;

  // Technical AEO
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasCanonical: boolean;
  hasSpeakableSchema: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  pageTitleLength: number;
}

export interface AEOCategory {
  name: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: AEOFinding[];
  opportunities: string[];
}

export interface AEOFinding {
  type: "pass" | "fail" | "warning";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

export interface AEOReport {
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  aeoReadiness: "AI-Ready" | "Needs Work" | "Not Optimized";
  summary: string;
  categories: {
    structuredData: AEOCategory;
    contentStructure: AEOCategory;
    authoritySignals: AEOCategory;
    featuredSnippets: AEOCategory;
    conversationalOptimization: AEOCategory;
  };
  topOpportunities: AEOOpportunity[];
  signals: AEOSignals;
  aiCitationProbability: "High" | "Medium" | "Low";
  competitiveInsight: string;
}

export interface AEOOpportunity {
  priority: number;
  title: string;
  description: string;
  estimatedImpact: "High" | "Medium" | "Low";
  effort: "Easy" | "Medium" | "Hard";
  category: string;
}

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

function calculateReadability(text: string): number {
  // Simplified Flesch-Kincaid approximation
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return (
      count + Math.max(1, word.toLowerCase().replace(/[^aeiou]/g, "").length)
    );
  }, 0);

  if (sentences.length === 0 || words.length === 0) return 50;

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  const score =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  return Math.min(100, Math.max(0, score));
}

function countConciseAnswers($: cheerio.CheerioAPI): number {
  let count = 0;
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    const words = text.split(/\s+/).length;
    // Concise answers: 20-80 words that follow a heading
    if (words >= 20 && words <= 80) {
      const prev = $(el).prev();
      if (prev.is("h1, h2, h3, h4, h5, h6")) {
        count++;
      }
    }
  });
  return count;
}

export function extractAEOSignals(html: string, url: string): AEOSignals {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();
  const lowerText = bodyText.toLowerCase();

  // --- Structured Data ---
  const schemaTypes = extractSchemaTypes(html);
  const hasSchemaOrg =
    html.includes("schema.org") || html.includes("application/ld+json");
  const hasFAQSchema = schemaTypes.includes("FAQPage");
  const hasHowToSchema = schemaTypes.includes("HowTo");
  const hasArticleSchema =
    schemaTypes.includes("Article") ||
    schemaTypes.includes("NewsArticle") ||
    schemaTypes.includes("BlogPosting");
  const hasProductSchema = schemaTypes.includes("Product");
  const hasBreadcrumbSchema = schemaTypes.includes("BreadcrumbList");
  const hasReviewSchema =
    schemaTypes.includes("Review") || schemaTypes.includes("AggregateRating");
  const hasSpeakableSchema = schemaTypes.includes("SpeakableSpecification");

  // --- Content Structure ---
  const headings = $("h1, h2, h3, h4, h5, h6");
  const questionHeadings: string[] = [];
  headings.each((_, el) => {
    const text = $(el).text().trim();
    if (
      text.endsWith("?") ||
      /^(what|how|why|when|where|who|which|can|do|does|is|are|will|should)/i.test(
        text
      )
    ) {
      questionHeadings.push(text);
    }
  });

  const hasFAQSection =
    hasFAQSchema ||
    lowerText.includes("frequently asked") ||
    lowerText.includes("faq") ||
    $('[class*="faq"], [id*="faq"]').length > 0;

  const hasDefinitionBlocks =
    $("dl, dt, dd").length > 0 ||
    $('[class*="definition"], [class*="glossary"]').length > 0;

  const hasOrderedLists = $("ol").length > 0;
  const hasTableData = $("table").length > 0;
  const hasSummaryBoxes =
    $('[class*="summary"], [class*="tldr"], [class*="key-points"]').length > 0;

  // --- Entity & Authority ---
  const hasAuthorInfo =
    $('[rel="author"], [class*="author"], [itemprop="author"]').length > 0 ||
    lowerText.includes("written by") ||
    lowerText.includes("author:");

  const hasPublishDate =
    $("time[datetime], [itemprop='datePublished'], [class*='date']").length >
      0 ||
    schemaTypes.some((t) => ["Article", "NewsArticle", "BlogPosting"].includes(t));

  const hasOrganizationInfo =
    schemaTypes.includes("Organization") ||
    schemaTypes.includes("LocalBusiness");

  const externalLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const linkUrl = new URL(href);
      const pageUrl = new URL(url);
      return linkUrl.hostname !== pageUrl.hostname;
    } catch {
      return false;
    }
  });

  const hasCitations =
    $('[class*="citation"], [class*="reference"], cite').length > 0 ||
    externalLinks.length > 2;

  // --- Featured Snippet ---
  const paragraphs = $("p");
  let totalLength = 0;
  let paraCount = 0;
  paragraphs.each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      totalLength += text.split(/\s+/).length;
      paraCount++;
    }
  });
  const avgParagraphLength = paraCount > 0 ? totalLength / paraCount : 0;

  const hasNumberedSteps = $("ol li").length >= 3;
  const hasDefinitionLists = $("dl").length > 0;
  const conciseAnswersCount = countConciseAnswers($);

  // Direct answers: paragraphs starting with declarative sentences
  const hasDirectAnswers = Array.from(paragraphs).some((el) => {
    const text = $(el).text().trim();
    return (
      text.length > 50 &&
      text.length < 300 &&
      /^(The|A|An|This|These|It|They|We)\s/i.test(text)
    );
  });

  // --- Conversational & NLP ---
  const titleText = $("title").text().toLowerCase();
  const titleIsQuestion =
    titleText.endsWith("?") ||
    /^(what|how|why|when|where|who|which)/.test(titleText);

  const hasNaturalLanguageQuestions = questionHeadings.length > 0;
  const hasWhatIsSection =
    lowerText.includes("what is") ||
    lowerText.includes("what are") ||
    lowerText.includes("definition of");
  const hasHowToSection =
    hasHowToSchema ||
    lowerText.includes("how to") ||
    lowerText.includes("step by step");

  const readabilityScore = calculateReadability(bodyText.slice(0, 5000));

  // --- Technical AEO ---
  const hasOpenGraph = $('meta[property^="og:"]').length > 0;
  const hasTwitterCard = $('meta[name^="twitter:"]').length > 0;
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasMetaDescription = $('meta[name="description"]').length > 0;
  const metaDescriptionLength = $(
    'meta[name="description"]'
  ).attr("content")?.length ?? 0;
  const pageTitleLength = $("title").text().length;

  return {
    hasSchemaOrg,
    schemaTypes,
    hasFAQSchema,
    hasHowToSchema,
    hasArticleSchema,
    hasProductSchema,
    hasBreadcrumbSchema,
    hasReviewSchema,
    hasDefinitionBlocks,
    hasFAQSection,
    hasOrderedLists,
    hasTableData,
    hasSummaryBoxes,
    questionHeadingsCount: questionHeadings.length,
    questionHeadings: questionHeadings.slice(0, 10),
    hasAuthorInfo,
    hasPublishDate,
    hasOrganizationInfo,
    hasCitations,
    hasExternalLinks: externalLinks.length > 0,
    externalLinksCount: externalLinks.length,
    hasDirectAnswers,
    avgParagraphLength,
    hasNumberedSteps,
    hasDefinitionLists,
    conciseAnswersCount,
    hasNaturalLanguageQuestions,
    titleIsQuestion,
    hasWhatIsSection,
    hasHowToSection,
    readabilityScore,
    hasOpenGraph,
    hasTwitterCard,
    hasCanonical,
    hasSpeakableSchema,
    hasMetaDescription,
    metaDescriptionLength,
    pageTitleLength,
  };
}

export function analyzeStructuredData(signals: AEOSignals): AEOCategory {
  const findings: AEOFinding[] = [];
  let score = 0;

  // Schema.org presence (25 pts)
  if (signals.hasSchemaOrg) {
    score += 25;
    findings.push({
      type: "pass",
      title: "Schema.org markup detected",
      description: `Found ${signals.schemaTypes.length} schema type(s): ${signals.schemaTypes.slice(0, 5).join(", ")}`,
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No Schema.org structured data",
      description:
        "AI engines heavily rely on structured data to understand and cite your content.",
      impact: "high",
    });
  }

  // FAQ Schema (20 pts)
  if (signals.hasFAQSchema) {
    score += 20;
    findings.push({
      type: "pass",
      title: "FAQPage schema implemented",
      description:
        "FAQ schema directly feeds AI answer engines with Q&A pairs.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "Missing FAQPage schema",
      description:
        "FAQPage schema is one of the most powerful AEO signals for appearing in AI-generated answers.",
      impact: "high",
    });
  }

  // HowTo Schema (15 pts)
  if (signals.hasHowToSchema) {
    score += 15;
    findings.push({
      type: "pass",
      title: "HowTo schema present",
      description: "Step-by-step content is optimally structured for AI extraction.",
      impact: "high",
    });
  } else if (signals.hasHowToSection) {
    score += 5;
    findings.push({
      type: "warning",
      title: "How-to content found but no HowTo schema",
      description:
        "You have how-to content but it's not marked up with schema. Add HowTo schema for better AI visibility.",
      impact: "medium",
    });
  }

  // Article/Content Schema (15 pts)
  if (signals.hasArticleSchema) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Article schema detected",
      description:
        "Article schema helps AI understand content type, author, and freshness.",
      impact: "medium",
    });
  }

  // Breadcrumb Schema (10 pts)
  if (signals.hasBreadcrumbSchema) {
    score += 10;
    findings.push({
      type: "pass",
      title: "BreadcrumbList schema found",
      description: "Helps AI understand site hierarchy and content context.",
      impact: "low",
    });
  }

  // Review/Rating Schema (10 pts)
  if (signals.hasReviewSchema) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Review/Rating schema present",
      description:
        "Social proof signals help establish authority for AI citations.",
      impact: "medium",
    });
  }

  // Speakable Schema (5 pts)
  if (signals.hasSpeakableSchema) {
    score += 5;
    findings.push({
      type: "pass",
      title: "Speakable schema implemented",
      description:
        "Content is marked as suitable for voice AI responses — an advanced AEO signal.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Speakable schema",
      description:
        "Add SpeakableSpecification to mark content for voice AI assistants.",
      impact: "low",
    });
  }

  const opportunities: string[] = [];
  if (!signals.hasFAQSchema)
    opportunities.push("Implement FAQPage JSON-LD schema");
  if (!signals.hasHowToSchema && signals.hasHowToSection)
    opportunities.push("Convert how-to content to HowTo schema");
  if (!signals.hasArticleSchema)
    opportunities.push("Add Article/BlogPosting schema with author and date");
  if (!signals.hasSpeakableSchema)
    opportunities.push("Add SpeakableSpecification for voice AI optimization");

  return {
    name: "Structured Data",
    score: Math.min(100, score),
    grade: scoreToGrade(Math.min(100, score)),
    findings,
    opportunities,
  };
}

export function analyzeContentStructure(signals: AEOSignals): AEOCategory {
  const findings: AEOFinding[] = [];
  let score = 0;

  // Question headings (25 pts)
  if (signals.questionHeadingsCount >= 5) {
    score += 25;
    findings.push({
      type: "pass",
      title: `${signals.questionHeadingsCount} question-format headings found`,
      description:
        "Question-based headings directly match AI query patterns and are heavily weighted by LLMs.",
      impact: "high",
    });
  } else if (signals.questionHeadingsCount >= 2) {
    score += 12;
    findings.push({
      type: "warning",
      title: `${signals.questionHeadingsCount} question headings found — aim for more`,
      description:
        "More question-format H2/H3 headings will significantly boost AI discoverability.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "Minimal question-format headings",
      description:
        "AI engines search for content that answers questions. Use 'What is X?', 'How does Y work?' heading patterns.",
      impact: "high",
    });
  }

  // FAQ section (20 pts)
  if (signals.hasFAQSection) {
    score += 20;
    findings.push({
      type: "pass",
      title: "FAQ section detected",
      description:
        "Dedicated FAQ sections are a top source for AI-generated answers.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No FAQ section found",
      description:
        "Adding a FAQ section with 5-10 Q&A pairs dramatically increases AI citation probability.",
      impact: "high",
    });
  }

  // Ordered/numbered lists (15 pts)
  if (signals.hasOrderedLists) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Numbered lists present",
      description:
        "Ordered lists are preferred by AI for step-by-step and ranked content.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No ordered lists found",
      description:
        "Use numbered lists for processes, steps, and rankings — AI engines extract these cleanly.",
      impact: "medium",
    });
  }

  // Table data (10 pts)
  if (signals.hasTableData) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Structured table data found",
      description:
        "Tables provide comparison and factual data that AI engines use for direct answers.",
      impact: "medium",
    });
  }

  // Definition blocks (10 pts)
  if (signals.hasDefinitionBlocks) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Definition/glossary elements detected",
      description:
        "Definition lists (DL/DT/DD) are extracted by AI for vocabulary and concept explanations.",
      impact: "medium",
    });
  }

  // Summary boxes (10 pts)
  if (signals.hasSummaryBoxes) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Summary/key-points sections found",
      description:
        "Summary boxes give AI engines pre-packaged answers to extract.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No summary or key-points sections",
      description:
        "Add TL;DR or key takeaway boxes — they're prime AI citation targets.",
      impact: "medium",
    });
  }

  // Paragraph length (10 pts)
  if (signals.avgParagraphLength >= 30 && signals.avgParagraphLength <= 80) {
    score += 10;
    findings.push({
      type: "pass",
      title: `Good paragraph density (avg ${Math.round(signals.avgParagraphLength)} words)`,
      description:
        "Paragraphs in the 30-80 word range are ideal for AI snippet extraction.",
      impact: "low",
    });
  } else if (signals.avgParagraphLength > 80) {
    findings.push({
      type: "warning",
      title: `Paragraphs may be too long (avg ${Math.round(signals.avgParagraphLength)} words)`,
      description:
        "Break large paragraphs into smaller chunks. AI prefers digestible, focused answers.",
      impact: "medium",
    });
  }

  const opportunities: string[] = [];
  if (!signals.hasFAQSection)
    opportunities.push("Add a FAQ section with 5-10 common questions");
  if (signals.questionHeadingsCount < 3)
    opportunities.push("Rewrite headings as questions (What is X? How does Y?)");
  if (!signals.hasSummaryBoxes)
    opportunities.push("Add TL;DR or key takeaways summary box at top");
  if (!signals.hasTableData)
    opportunities.push("Add comparison tables for factual data");

  return {
    name: "Content Structure",
    score: Math.min(100, score),
    grade: scoreToGrade(Math.min(100, score)),
    findings,
    opportunities,
  };
}

export function analyzeAuthoritySignals(signals: AEOSignals): AEOCategory {
  const findings: AEOFinding[] = [];
  let score = 0;

  // Author info (25 pts)
  if (signals.hasAuthorInfo) {
    score += 25;
    findings.push({
      type: "pass",
      title: "Author information present",
      description:
        "E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness) are critical for AI citation selection.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No author information found",
      description:
        "AI engines heavily favor content with identifiable, credible authors. Add author bio, name, and credentials.",
      impact: "high",
    });
  }

  // Publish date (20 pts)
  if (signals.hasPublishDate) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Publication/update date detected",
      description:
        "Fresh content is preferred by AI engines. Date signals help AI assess relevance.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No publication date found",
      description:
        "AI answers prioritize recent, dated content. Add datePublished and dateModified schema.",
      impact: "high",
    });
  }

  // Citations/External links (20 pts)
  if (signals.hasCitations && signals.externalLinksCount >= 3) {
    score += 20;
    findings.push({
      type: "pass",
      title: `${signals.externalLinksCount} external references/citations found`,
      description:
        "Outbound citations signal research quality and increase AI trustworthiness scores.",
      impact: "medium",
    });
  } else if (signals.externalLinksCount > 0) {
    score += 8;
    findings.push({
      type: "warning",
      title: "Few external citations",
      description:
        "Add more authoritative external citations (academic, government, industry sources).",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No external citations",
      description:
        "Cite credible external sources. AI engines use citation patterns to assess content quality.",
      impact: "medium",
    });
  }

  // Organization info (20 pts)
  if (signals.hasOrganizationInfo) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Organization schema found",
      description:
        "Organization schema establishes entity recognition in AI knowledge graphs.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No Organization schema",
      description:
        "Add Organization or LocalBusiness schema with name, logo, and contact info.",
      impact: "medium",
    });
  }

  // Canonical URL (15 pts)
  if (signals.hasCanonical) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Canonical URL defined",
      description:
        "Prevents duplicate content confusion and consolidates authority signals.",
      impact: "low",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No canonical URL",
      description:
        "Add a canonical tag to prevent content dilution across AI indexing.",
      impact: "low",
    });
  }

  const opportunities: string[] = [];
  if (!signals.hasAuthorInfo)
    opportunities.push("Add author bio with name, credentials, and photo");
  if (!signals.hasPublishDate)
    opportunities.push("Add datePublished and dateModified schema markup");
  if (signals.externalLinksCount < 3)
    opportunities.push("Cite 3-5 authoritative external sources");
  if (!signals.hasOrganizationInfo)
    opportunities.push("Add Organization schema with complete entity information");

  return {
    name: "Authority & Trust",
    score: Math.min(100, score),
    grade: scoreToGrade(Math.min(100, score)),
    findings,
    opportunities,
  };
}

export function analyzeFeaturedSnippets(signals: AEOSignals): AEOCategory {
  const findings: AEOFinding[] = [];
  let score = 0;

  // Direct answers (25 pts)
  if (signals.hasDirectAnswers) {
    score += 25;
    findings.push({
      type: "pass",
      title: "Direct answer patterns detected",
      description:
        "Content uses declarative answer structures that AI engines prefer for featured placements.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No clear direct-answer patterns",
      description:
        "Structure key paragraphs to directly answer questions. Start with 'X is...' or 'The best way to...'",
      impact: "high",
    });
  }

  // Concise answers (25 pts)
  if (signals.conciseAnswersCount >= 3) {
    score += 25;
    findings.push({
      type: "pass",
      title: `${signals.conciseAnswersCount} concise answer blocks found`,
      description:
        "Paragraphs of 40-60 words following headings are ideal for AI snippet extraction.",
      impact: "high",
    });
  } else if (signals.conciseAnswersCount >= 1) {
    score += 10;
    findings.push({
      type: "warning",
      title: `Only ${signals.conciseAnswersCount} concise answer block(s) found`,
      description:
        "Aim for more 40-60 word answer paragraphs directly after each heading.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No concise answer blocks found",
      description:
        "After each heading, add a 40-60 word direct answer before elaborating.",
      impact: "high",
    });
  }

  // Numbered steps (20 pts)
  if (signals.hasNumberedSteps) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Numbered step sequences found",
      description:
        "Ordered lists are a top format for AI answer extraction and voice responses.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "warning",
      title: "No numbered steps",
      description:
        "Convert process descriptions into numbered lists for better AI extraction.",
      impact: "medium",
    });
  }

  // Definition lists (15 pts)
  if (signals.hasDefinitionLists) {
    score += 15;
    findings.push({
      type: "pass",
      title: "Definition list markup used",
      description:
        "HTML definition lists are semantically rich and preferred by AI for glossary-style answers.",
      impact: "medium",
    });
  }

  // Meta description (15 pts)
  if (
    signals.hasMetaDescription &&
    signals.metaDescriptionLength >= 120 &&
    signals.metaDescriptionLength <= 160
  ) {
    score += 15;
    findings.push({
      type: "pass",
      title: `Meta description optimized (${signals.metaDescriptionLength} chars)`,
      description:
        "Well-crafted meta descriptions are used by AI as content summaries.",
      impact: "medium",
    });
  } else if (signals.hasMetaDescription) {
    score += 7;
    findings.push({
      type: "warning",
      title: `Meta description length not optimal (${signals.metaDescriptionLength} chars)`,
      description: "Aim for 120-160 characters with a clear value proposition.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No meta description",
      description:
        "Meta descriptions serve as AI-ready content summaries. Add a compelling 150-char description.",
      impact: "medium",
    });
  }

  const opportunities: string[] = [];
  if (!signals.hasDirectAnswers)
    opportunities.push("Add direct answer sentences after each heading");
  if (signals.conciseAnswersCount < 3)
    opportunities.push("Create 40-60 word answer paragraphs for key questions");
  if (!signals.hasNumberedSteps)
    opportunities.push("Convert process descriptions to numbered lists");
  if (!signals.hasMetaDescription)
    opportunities.push("Write a 150-char meta description with clear value prop");

  return {
    name: "Featured Snippet Optimization",
    score: Math.min(100, score),
    grade: scoreToGrade(Math.min(100, score)),
    findings,
    opportunities,
  };
}

export function analyzeConversationalOptimization(
  signals: AEOSignals
): AEOCategory {
  const findings: AEOFinding[] = [];
  let score = 0;

  // Title as question (20 pts)
  if (signals.titleIsQuestion) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Page title is in question format",
      description:
        "Question-format titles directly match conversational AI search queries.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "warning",
      title: "Page title is not question-format",
      description:
        "Consider question-format titles for content pages (e.g., 'What Is X? Complete Guide').",
      impact: "medium",
    });
  }

  // Natural language questions (20 pts)
  if (signals.hasNaturalLanguageQuestions && signals.questionHeadingsCount >= 3) {
    score += 20;
    findings.push({
      type: "pass",
      title: "Strong question-based content structure",
      description:
        `${signals.questionHeadingsCount} question-format headings align perfectly with conversational AI queries.`,
      impact: "high",
    });
  } else if (signals.hasNaturalLanguageQuestions) {
    score += 10;
    findings.push({
      type: "warning",
      title: "Some question headings present",
      description: "Add more question-format headings throughout the content.",
      impact: "high",
    });
  }

  // What Is / Definition sections (20 pts)
  if (signals.hasWhatIsSection) {
    score += 20;
    findings.push({
      type: "pass",
      title: "'What is X?' section detected",
      description:
        "Definition sections are the #1 source for AI answer extractions on informational queries.",
      impact: "high",
    });
  } else {
    findings.push({
      type: "fail",
      title: "No 'What is X?' section",
      description:
        "Add a clear definition/overview section. 'What is X?' is the most common AI query pattern.",
      impact: "high",
    });
  }

  // How-to content (15 pts)
  if (signals.hasHowToSection) {
    score += 15;
    findings.push({
      type: "pass",
      title: "How-to content present",
      description:
        "Instructional content is heavily favored by AI for procedural queries.",
      impact: "medium",
    });
  }

  // Readability (15 pts)
  if (signals.readabilityScore >= 60) {
    score += 15;
    findings.push({
      type: "pass",
      title: `Good readability score (${Math.round(signals.readabilityScore)}/100)`,
      description:
        "Accessible writing style aligns with AI's preference for clear, understandable content.",
      impact: "medium",
    });
  } else if (signals.readabilityScore >= 40) {
    score += 7;
    findings.push({
      type: "warning",
      title: `Moderate readability (${Math.round(signals.readabilityScore)}/100)`,
      description:
        "Simplify sentence structure and vocabulary for better AI alignment.",
      impact: "medium",
    });
  } else {
    findings.push({
      type: "fail",
      title: `Low readability score (${Math.round(signals.readabilityScore)}/100)`,
      description:
        "Complex writing reduces AI citation probability. Aim for 8th-grade reading level.",
      impact: "medium",
    });
  }

  // Social/OG metadata (10 pts)
  if (signals.hasOpenGraph && signals.hasTwitterCard) {
    score += 10;
    findings.push({
      type: "pass",
      title: "Complete social metadata (OG + Twitter Card)",
      description:
        "Social metadata helps AI understand content purpose and shareability signals.",
      impact: "low",
    });
  } else if (signals.hasOpenGraph || signals.hasTwitterCard) {
    score += 5;
    findings.push({
      type: "warning",
      title: "Partial social metadata",
      description: "Add both Open Graph and Twitter Card metadata.",
      impact: "low",
    });
  }

  const opportunities: string[] = [];
  if (!signals.hasWhatIsSection)
    opportunities.push("Add a 'What is [Topic]?' definition section");
  if (!signals.titleIsQuestion)
    opportunities.push("Test question-format page titles for key content pages");
  if (signals.readabilityScore < 60)
    opportunities.push("Simplify writing to 8th-grade reading level");
  if (!signals.hasHowToSection)
    opportunities.push("Add step-by-step how-to sections with numbered lists");

  return {
    name: "Conversational Optimization",
    score: Math.min(100, score),
    grade: scoreToGrade(Math.min(100, score)),
    findings,
    opportunities,
  };
}

export function buildAEOReport(
  signals: AEOSignals,
  url: string
): AEOReport {
  const structuredData = analyzeStructuredData(signals);
  const contentStructure = analyzeContentStructure(signals);
  const authoritySignals = analyzeAuthoritySignals(signals);
  const featuredSnippets = analyzeFeaturedSnippets(signals);
  const conversationalOptimization = analyzeConversationalOptimization(signals);

  const categories = {
    structuredData,
    contentStructure,
    authoritySignals,
    featuredSnippets,
    conversationalOptimization,
  };

  // Weighted overall score
  const overallScore = Math.round(
    structuredData.score * 0.25 +
      contentStructure.score * 0.25 +
      authoritySignals.score * 0.2 +
      featuredSnippets.score * 0.2 +
      conversationalOptimization.score * 0.1
  );

  const overallGrade = scoreToGrade(overallScore);

  const aeoReadiness: AEOReport["aeoReadiness"] =
    overallScore >= 75
      ? "AI-Ready"
      : overallScore >= 50
        ? "Needs Work"
        : "Not Optimized";

  const aiCitationProbability: AEOReport["aiCitationProbability"] =
    overallScore >= 70
      ? "High"
      : overallScore >= 45
        ? "Medium"
        : "Low";

  // Collect all opportunities, deduplicate, and rank by category score (worst first)
  const allOpportunities: AEOOpportunity[] = [];
  let priority = 1;

  const categoryList = [
    { cat: structuredData, catName: "Structured Data" },
    { cat: contentStructure, catName: "Content Structure" },
    { cat: authoritySignals, catName: "Authority & Trust" },
    { cat: featuredSnippets, catName: "Featured Snippets" },
    { cat: conversationalOptimization, catName: "Conversational" },
  ].sort((a, b) => a.cat.score - b.cat.score);

  for (const { cat, catName } of categoryList) {
    for (const opp of cat.opportunities) {
      const highImpact =
        cat.findings.some(
          (f) => f.type === "fail" && f.impact === "high"
        ) && priority <= 3;

      allOpportunities.push({
        priority: priority++,
        title: opp,
        description: `Improves your ${catName} AEO score`,
        estimatedImpact: highImpact ? "High" : cat.score < 50 ? "Medium" : "Low",
        effort: opp.toLowerCase().includes("schema") ? "Medium" : "Easy",
        category: catName,
      });
    }
  }

  const summary =
    overallScore >= 75
      ? `This page is well-optimized for AI answer engines with solid structured data and content signals. Focus on ${allOpportunities[0]?.title.toLowerCase() ?? "advanced optimizations"} to reach elite AEO status.`
      : overallScore >= 50
        ? `This page has foundational AEO elements but significant gaps remain. AI citation probability is currently ${aiCitationProbability}. Prioritize structured data and question-based content restructuring.`
        : `This page has minimal AEO optimization and is unlikely to be cited by AI answer engines (ChatGPT, Perplexity, Gemini) in its current state. Immediate action on structured data and content structure is recommended.`;

  const competitiveInsight =
    signals.hasFAQSchema && signals.hasAuthorInfo && signals.questionHeadingsCount >= 3
      ? "Your AEO signals are stronger than most competitors. Maintain freshness and add more conversational Q&A content to dominate AI citations."
      : !signals.hasSchemaOrg
        ? "Most high-ranking competitors implement structured data. Without it, you're invisible to the AI answer layer."
        : "Competitors with FAQ sections and question-based headings are winning AI citations. This is low-hanging fruit with immediate impact.";

  return {
    overallScore,
    overallGrade,
    aeoReadiness,
    summary,
    categories,
    topOpportunities: allOpportunities.slice(0, 6),
    signals,
    aiCitationProbability,
    competitiveInsight,
  };
}
