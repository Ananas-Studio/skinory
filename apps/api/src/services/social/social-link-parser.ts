// ─── Social Link Parser ──────────────────────────────────────────────────────
// Parses social media URLs to detect platform, normalize the URL, and extract
// resource type / ID.

export type Platform = "instagram" | "tiktok" | "facebook" | "unknown"
export type ResourceType = "post" | "reel" | "video" | "story" | "unknown"

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
]

// ─── Tracking param cleanup ──────────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "igshid", "igsh", "fbclid", "ref", "share_id", "locale",
  "tt_from", "is_from_webapp", "sender_device",
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
