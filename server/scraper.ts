import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import sanitizeHtml from "sanitize-html";
import { htmlToText } from "html-to-text";
import type { Chapter, BookMetadata, ContentTypeType, OutputFormatType } from "@shared/schema";
import { randomUUID } from "crypto";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  timeout = 30000
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to fetch URL");
}

const chapterPatterns = [
  /chapter\s*[\d.]+/i,
  /ch\.\s*[\d.]+/i,
  /episode\s*[\d.]+/i,
  /part\s*[\d.]+/i,
  /volume\s*[\d.]+/i,
  /book\s*[\d.]+/i,
  /section\s*[\d.]+/i,
  /prologue/i,
  /epilogue/i,
  /introduction/i,
  /preface/i,
];

const chapterLinkSelectors = [
  'a[href*="chapter"]',
  'a[href*="ch"]',
  'a[href*="episode"]',
  'a[href*="part"]',
  ".chapter-list a",
  ".toc a",
  ".table-of-contents a",
  ".chapters a",
  ".chapter-item a",
  "#chapter-list a",
  ".story-parts a",
  ".volume-list a",
  '[class*="chapter"] a',
  '[id*="chapter"] a',
  "ul.chapters li a",
  ".entry-content a",
  "article a",
];

const contentSelectors = [
  ".chapter-content",
  ".entry-content",
  ".post-content",
  ".story-content",
  ".reading-content",
  ".text-content",
  ".novel-content",
  "#chapter-content",
  "#content",
  "article.post",
  "article",
  ".content",
  "main",
  ".prose",
  '[class*="content"]',
  '[class*="chapter"]',
];

const removeSelectors = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "header:not(.chapter-header)",
  "footer",
  ".ads",
  ".advertisement",
  ".social-share",
  ".comments",
  ".sidebar",
  ".navigation",
  ".pagination",
  ".related-posts",
  '[class*="ad-"]',
  '[id*="ad-"]',
  '[class*="banner"]',
  ".share-buttons",
  ".author-box",
  ".widget",
  ".popup",
  ".modal",
];

function isChapterLink(text: string, href: string): boolean {
  const combinedText = `${text} ${href}`.toLowerCase();
  return chapterPatterns.some((pattern) => pattern.test(combinedText));
}

function extractNumber(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : Infinity;
}

function detectContentType(html: string, url: string): ContentTypeType {
  const $ = cheerio.load(html);
  const text = $.text().toLowerCase();
  const urlLower = url.toLowerCase();

  const technicalKeywords = [
    "documentation",
    "api",
    "function",
    "class",
    "method",
    "parameter",
    "return",
    "example",
    "code",
    "tutorial",
    "guide",
    "reference",
  ];
  const novelKeywords = [
    "novel",
    "chapter",
    "story",
    "character",
    "said",
    "replied",
    "whispered",
    "shouted",
    "fiction",
    "fanfic",
  ];
  const articleKeywords = [
    "blog",
    "post",
    "article",
    "news",
    "author",
    "published",
    "written by",
  ];

  let technicalScore = 0;
  let novelScore = 0;
  let articleScore = 0;

  technicalKeywords.forEach((kw) => {
    if (text.includes(kw) || urlLower.includes(kw)) technicalScore++;
  });

  novelKeywords.forEach((kw) => {
    if (text.includes(kw) || urlLower.includes(kw)) novelScore++;
  });

  articleKeywords.forEach((kw) => {
    if (text.includes(kw) || urlLower.includes(kw)) articleScore++;
  });

  if ($("pre code").length > 3 || $("code").length > 10) {
    technicalScore += 5;
  }

  if (technicalScore > novelScore && technicalScore > articleScore) {
    return "technical";
  }
  if (novelScore > technicalScore && novelScore > articleScore) {
    return "novel";
  }
  if (articleScore > 0) {
    return "article";
  }

  return "unknown";
}

function recommendFormat(contentType: ContentTypeType): OutputFormatType {
  switch (contentType) {
    case "technical":
      return "pdf";
    case "novel":
      return "epub";
    case "article":
      return "epub";
    default:
      return "epub";
  }
}

export async function analyzeUrl(url: string): Promise<{
  metadata: BookMetadata;
  chapters: Chapter[];
}> {
  let html = await fetchWithRetry(url);
  let $ = cheerio.load(html);

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    "Untitled";

  const author =
    $('meta[name="author"]').attr("content") ||
    $('meta[property="article:author"]').attr("content") ||
    $(".author").first().text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    "Unknown Author";

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $(".description").first().text().trim() ||
    $(".synopsis").first().text().trim() ||
    "";

  const coverUrl =
    $('meta[property="og:image"]').attr("content") ||
    $('img[class*="cover"]').first().attr("src") ||
    $(".book-cover img").first().attr("src") ||
    undefined;

  const chapters: Chapter[] = [];
  const seenUrls = new Set<string>();
  let currentPageUrl = url;
  let pageCount = 0;
  const maxPages = 50;

  while (currentPageUrl && pageCount < maxPages) {
    pageCount++;
    html = await fetchWithRetry(currentPageUrl);
    $ = cheerio.load(html);

    // Extract chapters from current page using all selectors
    for (const selector of chapterLinkSelectors) {
      $(selector).each((index, element) => {
        const $el = $(element);
        const href = $el.attr("href");
        const text = $el.text().trim();

        if (!href || !text) return;

        let fullUrl: string;
        try {
          fullUrl = new URL(href, currentPageUrl).href;
        } catch {
          return;
        }

        if (seenUrls.has(fullUrl)) return;

        if (isChapterLink(text, href)) {
          seenUrls.add(fullUrl);
          chapters.push({
            id: randomUUID(),
            title: text.substring(0, 200),
            url: fullUrl,
            index: chapters.length,
            status: "pending",
          });
        }
      });
    }

    // Fallback: if no chapters found with specific selectors, try all links
    if (chapters.length === 0) {
      $("a").each((index, element) => {
        const $el = $(element);
        const href = $el.attr("href");
        const text = $el.text().trim();

        if (!href || !text || text.length > 200) return;

        let fullUrl: string;
        try {
          fullUrl = new URL(href, currentPageUrl).href;
        } catch {
          return;
        }

        if (seenUrls.has(fullUrl)) return;

        if (isChapterLink(text, href)) {
          seenUrls.add(fullUrl);
          chapters.push({
            id: randomUUID(),
            title: text,
            url: fullUrl,
            index: chapters.length,
            status: "pending",
          });
        }
      });
    }

    // Look for next page link
    const nextPageSelectors = [
      'a[rel="next"]',
      'a.next',
      'a:contains("Next")',
      '.pagination a.next',
      'a[aria-label*="Next"]',
      'a:contains("→")',
      'a:contains("»")',
    ];

    let nextPageUrl: string | null = null;
    for (const selector of nextPageSelectors) {
      const nextLink = $(selector).first();
      if (nextLink.length > 0) {
        const href = nextLink.attr("href");
        if (href) {
          try {
            nextPageUrl = new URL(href, currentPageUrl).href;
            break;
          } catch {
            continue;
          }
        }
      }
    }

    currentPageUrl = nextPageUrl || "";
  }

  // If we got very few chapters, try URL pattern generation (for sites like WuxiaSpot)
  if (chapters.length < 20) {
    const urlPattern = url.match(/(.+?\/novel\/[^_]+)(_\d+)?\.html?/);
    if (urlPattern) {
      const baseUrl = urlPattern[1];
      const maxChaptersToTry = 500;
      
      for (let i = 1; i <= maxChaptersToTry; i++) {
        const chapterUrl = `${baseUrl}_${i}.html`;
        if (!seenUrls.has(chapterUrl)) {
          try {
            const response = await fetch(chapterUrl, {
              headers: { "User-Agent": getRandomUserAgent() },
              signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
              chapters.push({
                id: randomUUID(),
                title: `Chapter ${i}`,
                url: chapterUrl,
                index: chapters.length,
                status: "pending",
              });
              seenUrls.add(chapterUrl);
            }
          } catch {
            // Skip this chapter if fetch fails
          }
        }
      }
    }
  }

  chapters.sort((a, b) => {
    const numA = extractNumber(a.title);
    const numB = extractNumber(b.title);
    if (numA !== Infinity && numB !== Infinity) {
      return numA - numB;
    }
    return a.index - b.index;
  });

  chapters.forEach((ch, idx) => {
    ch.index = idx;
  });

  const contentType = detectContentType(html, url);
  const recommendedFormat = recommendFormat(contentType);

  const metadata: BookMetadata = {
    title: title.substring(0, 500),
    author: author.substring(0, 200),
    description: description.substring(0, 2000),
    coverUrl,
    sourceUrl: url,
    detectedContentType: contentType,
    recommendedFormat,
    totalChapters: chapters.length,
    language: $("html").attr("lang") || "en",
  };

  return { metadata, chapters };
}

export async function fetchChapterContent(
  chapterUrl: string,
  cleanup = true
): Promise<{ content: string; wordCount: number }> {
  const html = await fetchWithRetry(chapterUrl);
  const $ = cheerio.load(html);

  removeSelectors.forEach((selector) => {
    $(selector).remove();
  });

  let content = "";

  for (const selector of contentSelectors) {
    const $content = $(selector);
    if ($content.length > 0) {
      content = $content.first().html() || "";
      if (content.length > 500) break;
    }
  }

  if (content.length < 500) {
    content = $("body").html() || "";
  }

  if (cleanup) {
    content = sanitizeHtml(content, {
      allowedTags: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "strong", "b", "em", "i", "u", "s", "strike",
        "blockquote", "pre", "code",
        "ul", "ol", "li",
        "a", "img",
        "div", "span",
        "table", "thead", "tbody", "tr", "th", "td",
      ],
      allowedAttributes: {
        a: ["href", "title"],
        img: ["src", "alt", "title"],
        "*": ["class"],
      },
      allowedSchemes: ["http", "https", "data"],
    });
  }

  const textContent = htmlToText(content, {
    wordwrap: false,
    preserveNewlines: true,
  });

  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

  return { content, wordCount };
}

export async function downloadChaptersParallel(
  chapters: Chapter[],
  concurrency: number,
  delayMs: number,
  onProgress: (chapterId: string, status: "downloading" | "complete" | "error", content?: string, wordCount?: number, error?: string) => void
): Promise<void> {
  const queue = [...chapters];

  const processChapter = async (chapter: Chapter): Promise<void> => {
    onProgress(chapter.id, "downloading");

    try {
      const { content, wordCount } = await fetchChapterContent(chapter.url);
      onProgress(chapter.id, "complete", content, wordCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      onProgress(chapter.id, "error", undefined, undefined, errorMessage);
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  };

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const chapter = queue.shift();
      if (chapter) {
        await processChapter(chapter);
      }
    }
  });

  await Promise.all(workers);
}
