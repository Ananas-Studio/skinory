// ─── Social Link Parser ──────────────────────────────────────────────────────
// Parses social media and e-commerce URLs to detect platform, normalize the
// URL, and extract resource type / ID.

export type Platform =
  | "instagram" | "tiktok" | "facebook"
  | "amazon" | "noon" | "trendyol" | "hepsiburada" | "watsons" | "gratis" | "sevil"
  | "sephora" | "lookfantastic" | "namshi"
  | "unknown"

export type ResourceType = "post" | "reel" | "video" | "story" | "product" | "unknown"

const ECOMMERCE_PLATFORMS = new Set<Platform>([
  "amazon", "noon", "trendyol", "hepsiburada", "watsons", "gratis", "sevil",
  "sephora", "lookfantastic", "namshi",
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
      // Matches any Amazon regional domain (amazon.com, amazon.co.uk, amazon.ae, etc.)
      /(?:www\.)?amazon\.[a-z]{2,3}(?:\.[a-z]{2})?/i,
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
    platform: "noon",
    hostPatterns: [
      /(?:www\.)?noon\.com/i,
    ],
    resourceExtractors: [
      // Product page: /uae-en/product-slug/N12345678A/p/
      { pattern: /\/([NZ]\d{6,12}[A-Z]?)\/p\/?/, type: "product", idGroup: 1 },
      // Direct product ID in path without /p/ suffix
      { pattern: /\/([NZ]\d{6,12}[A-Z]?)\/?$/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "trendyol",
    hostPatterns: [/(?:www\.)?trendyol\.com/i, /(?:www\.)?trendyol\.ar/i, /ty\.gl/i],
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
  {
    platform: "sephora",
    hostPatterns: [
      // Sephora global + regional domains
      /(?:www\.)?sephora\.com/i,
      /(?:www\.)?sephora\.com\.tr/i,
      /(?:www\.)?sephora\.ae/i,
      /(?:www\.)?sephora\.sa/i,
      /(?:www\.)?sephora\.me/i,
      /(?:www\.)?sephora\.co\.[a-z]{2}/i,
      /(?:www\.)?sephora\.[a-z]{2}/i,
    ],
    resourceExtractors: [
      // sephora.com: /product/product-name-PXXXXXX
      { pattern: /\/product\/[^?#]*-?(P\d{5,})/, type: "product", idGroup: 1 },
      // sephora.ae/en/p/product-name-PXXXXXXX.html
      { pattern: /\/p\/[^?#]*-?(P\d{5,})\.html/, type: "product", idGroup: 1 },
      // Generic /p/ path without .html
      { pattern: /\/p\/([^/?#]+)/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "lookfantastic",
    hostPatterns: [
      /(?:www\.)?lookfantastic\.[a-z]{2,3}(?:\.[a-z]{2})?/i,
    ],
    resourceExtractors: [
      // lookfantastic: /product-slug/12345678.html
      { pattern: /\/(\d{6,10})\.html/, type: "product", idGroup: 1 },
      // Fallback: any slug path
      { pattern: /\/([a-z0-9][\w-]+\/\d+)\.html/, type: "product", idGroup: 1 },
    ],
  },
  {
    platform: "namshi",
    hostPatterns: [
      /(?:www\.)?namshi\.com/i,
    ],
    resourceExtractors: [
      // namshi: /uae-en/p/product-name/W12345678/
      { pattern: /\/p\/[^/]*\/([A-Z]?\d{5,})/, type: "product", idGroup: 1 },
      // namshi: /buy/product-name.html
      { pattern: /\/buy\/([^/?#]+)/, type: "product", idGroup: 1 },
      // Fallback: any -p- pattern
      { pattern: /-p-(\d+)/, type: "product", idGroup: 1 },
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
  "pd_rd_w", "pd_rd_wg", "pd_rd_r", "pd_rd_i",
  "pf_rd_p", "pf_rd_r", "pf_rd_s", "pf_rd_t", "pf_rd_i",
  "content-id",
  // Trendyol
  "boutiqueId", "merchantId", "sav",
  // Hepsiburada
  "magession",
  // Noon
  "offer", "mp",
  // Sephora
  "skuId", "icid", "icid2",
  // Lookfantastic / THG
  "variation", "affil", "thg",
  // Namshi
  "sku",
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
