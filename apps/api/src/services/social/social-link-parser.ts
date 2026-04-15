// ─── Social Link Parser ──────────────────────────────────────────────────────
// Parses social media and e-commerce URLs to detect platform, normalize the
// URL, and extract resource type / ID.

export type Platform =
  | "instagram" | "tiktok" | "facebook"
  | "amazon" | "trendyol" | "hepsiburada" | "watsons" | "gratis" | "sevil"
  | "unknown"

export type ResourceType = "post" | "reel" | "video" | "story" | "product" | "unknown"

const ECOMMERCE_PLATFORMS = new Set<Platform>([
  "amazon", "trendyol", "hepsiburada", "watsons", "gratis", "sevil",
])

export function isEcommercePlatform(platform: Platform): boolean {
  return ECOMMERCE_PLATFORMS.has(platform)
}

export interface ParsedSocialLink {
  platform: Platform
  normalizedUrl: string
  resourceType: ResourceType
  resourceId: string | null
}

// ─── Platform detection patterns ─────────────────────────────────────────────

interface PlatformRule {
  platform: Platform
  hostPatterns: RegExp[]
  resourceExtractors: {
    pattern: RegExp
    type: ResourceType
    idGroup: number
  }[]
}

const PLATFORM_RULES: PlatformRule[] = [
  // ── Social media ───────────────────────────────────────────────────────────
  {
    platform: "instagram",
    hostPatterns: [/(?:www\.)?instagram\.com/i, /(?:www\.)?instagr\.am/i],
    resourceExtractors: [
      { pattern: /\/reel\/([A-Za-z0-9_-]+)/, type: "reel", idGroup: 1 },
      { pattern: /\/p\/([A-Za-z0-9_-]+)/, type: "post", idGroup: 1 },
      { pattern: /\/stories\/[^/]+\/(\d+)/, type: "story", idGroup: 1 },
      { pattern: /\/tv\/([A-Za-z0-9_-]+)/, type: "video", idGroup: 1 },
    ],
  },
  {
    platform: "tiktok",
    hostPatterns: [/(?:www\.)?tiktok\.com/i, /(?:vm\.)?tiktok\.com/i],
    resourceExtractors: [
      { pattern: /\/video\/(\d+)/, type: "video", idGroup: 1 },
      { pattern: /\/@[^/]+\/video\/(\d+)/, type: "video", idGroup: 1 },
      // Short links like vm.tiktok.com/ZMxxxxxx/
      { pattern: /\/([A-Za-z0-9]+)\/?$/, type: "video", idGroup: 1 },
    ],
  },
  {
    platform: "facebook",
    hostPatterns: [
      /(?:www\.)?facebook\.com/i,
      /(?:www\.)?fb\.com/i,
      /(?:www\.)?fb\.watch/i,
      /(?:m\.)?facebook\.com/i,
    ],
    resourceExtractors: [
      { pattern: /\/watch\/?\?v=(\d+)/, type: "video", idGroup: 1 },
      { pattern: /\/videos\/(\d+)/, type: "video", idGroup: 1 },
      { pattern: /\/reel\/(\d+)/, type: "reel", idGroup: 1 },
      { pattern: /\/posts\/([A-Za-z0-9_.-]+)/, type: "post", idGroup: 1 },
      { pattern: /\/photo(?:\.php)?\?fbid=(\d+)/, type: "post", idGroup: 1 },
      { pattern: /\/permalink\.php\?.*story_fbid=(\d+)/, type: "post", idGroup: 1 },
    ],
  },

  // ── E-commerce ─────────────────────────────────────────────────────────────
  {
    platform: "amazon",
    hostPatterns: [
      /(?:www\.)?amazon\.com\.tr/i,
      /(?:www\.)?amazon\.com/i,
      /(?:www\.)?amazon\.de/i,
      /(?:www\.)?amazon\.co\.uk/i,
      /(?:www\.)?amazon\.fr/i,
      /(?:www\.)?amazon\.es/i,
      /(?:www\.)?amazon\.it/i,
      /(?:www\.)?amazon\.co\.jp/i,
      /(?:www\.)?amzn\.to/i,
      /(?:www\.)?amzn\.eu/i,
    ],
    resourceExtractors: [
      { pattern: /\/dp\/([A-Z0-9]{10})/, type: "product", idGroup: 1 },
      { pattern: /\/gp\/product\/([A-Z0-9]{10})/, type: "product", idGroup: 1 },
      { pattern: /\/gp\/aw\/d\/([A-Z0-9]{10})/, type: "product", idGroup: 1 },
      // Short link fallback (amzn.to/xxxxx)
      { pattern: /\/([A-Za-z0-9]+)\/?$/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "trendyol",
    hostPatterns: [/(?:www\.)?trendyol\.com/i, /ty\.gl/i],
    resourceExtractors: [
      { pattern: /-p-(\d+)/, type: "product", idGroup: 1 },
      // Short link fallback
      { pattern: /\/([A-Za-z0-9]+)\/?$/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "hepsiburada",
    hostPatterns: [/(?:www\.)?hepsiburada\.com/i],
    resourceExtractors: [
      { pattern: /-p-([A-Z0-9]+)(?:\?|$)/, type: "product", idGroup: 1 },
      // Slug-based product page (has a path but no -p- suffix)
      { pattern: /^\/([a-z0-9][\w-]+-p-[A-Z0-9]+)/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "watsons",
    hostPatterns: [/(?:www\.)?watsons\.com\.tr/i],
    resourceExtractors: [
      // Watsons product URLs: /product-slug/p/PRODUCT_ID
      { pattern: /\/p\/(\d+)/, type: "product", idGroup: 1 },
      { pattern: /\/([^/]+-p-\d+)/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "gratis",
    hostPatterns: [
      /(?:www\.)?grfrk\.com/i,
      /(?:www\.)?gratis\.com/i,
    ],
    resourceExtractors: [
      // Gratis product URLs: /product-slug-p-PRODUCT_ID
      { pattern: /-p-(\d+)/, type: "product", idGroup: 1 },
      { pattern: /\/p\/(\d+)/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "sevil",
    hostPatterns: [/(?:www\.)?sevil\.com\.tr/i],
    resourceExtractors: [
      // Sevil product URLs: /product-slug
      { pattern: /\/([a-z0-9][\w-]+)(?:\?|$)/i, type: "product", idGroup: 1 },
    ],
  },
]

// ─── Tracking param cleanup ──────────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "igshid", "igsh", "fbclid", "ref", "share_id", "locale",
  "tt_from", "is_from_webapp", "sender_device",
  // Amazon
  "tag", "linkCode", "linkId", "ref_", "psc", "sprefix", "crid",
  "dib", "dib_tag", "keywords", "qid", "sr", "th",
  // Trendyol
  "boutiqueId", "merchantId", "sav",
  // Hepsiburada
  "magession",
])

function stripTrackingParams(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) {
      url.searchParams.delete(key)
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseSocialLink(rawUrl: string): ParsedSocialLink {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return {
      platform: "unknown",
      normalizedUrl: rawUrl.trim(),
      resourceType: "unknown",
      resourceId: null,
    }
  }

  // Force https
  url.protocol = "https:"
  // Strip hash
  url.hash = ""
  // Remove tracking params
  stripTrackingParams(url)

  const hostname = url.hostname.toLowerCase()
  const fullPath = url.pathname + url.search

  for (const rule of PLATFORM_RULES) {
    const hostMatch = rule.hostPatterns.some((p) => p.test(hostname))
    if (!hostMatch) continue

    for (const extractor of rule.resourceExtractors) {
      const match = fullPath.match(extractor.pattern)
      if (match) {
        return {
          platform: rule.platform,
          normalizedUrl: url.toString(),
          resourceType: extractor.type,
          resourceId: match[extractor.idGroup] ?? null,
        }
      }
    }

    // Platform matched but no specific resource pattern
    return {
      platform: rule.platform,
      normalizedUrl: url.toString(),
      resourceType: "unknown",
      resourceId: null,
    }
  }

  return {
    platform: "unknown",
    normalizedUrl: url.toString(),
    resourceType: "unknown",
    resourceId: null,
  }
}
