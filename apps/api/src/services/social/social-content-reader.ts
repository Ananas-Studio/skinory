// ─── Social Content Reader ───────────────────────────────────────────────────
// Fetches text/author/thumbnail from a social media post via oEmbed first,
// then falls back to OpenGraph tag scraping.

import type { Platform } from "./social-link-parser.js"
import { fetchViaScrapingBee } from "../scrapingbee-client.js"

export interface SocialContent {
  text: string
  author: string | null
  thumbnail: string | null
  metadata: Record<string, unknown>
}

const EMPTY_CONTENT: SocialContent = {
  text: "",
  author: null,
  thumbnail: null,
  metadata: {},
}

// ─── oEmbed endpoints ────────────────────────────────────────────────────────

const OEMBED_ENDPOINTS: Partial<Record<Platform, string>> = {
  tiktok: "https://www.tiktok.com/oembed",
  instagram: "https://graph.facebook.com/v22.0/instagram_oembed",
  facebook: "https://graph.facebook.com/v22.0/oembed_post",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000
const MAX_RETRIES = 2

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

// ─── oEmbed reader ───────────────────────────────────────────────────────────

interface OEmbedResponse {
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
  html?: string
  [key: string]: unknown
}

async function readViaOEmbed(platform: Platform, url: string): Promise<SocialContent | null> {
  const endpoint = OEMBED_ENDPOINTS[platform]
  if (!endpoint) return null

  try {
    const oembedUrl = `${endpoint}?url=${encodeURIComponent(url)}&format=json`
    const res = await fetchWithRetry(oembedUrl)
    if (!res.ok) return null

    const data = (await res.json()) as OEmbedResponse

    const text = data.title ?? ""
    const author = data.author_name ?? null
    const thumbnail = data.thumbnail_url ?? null

    if (!text && !author && !thumbnail) return null

    return { text, author, thumbnail, metadata: data }
  } catch {
    return null
  }
}

// ─── OpenGraph fallback ──────────────────────────────────────────────────────

function extractMetaContent(html: string, property: string): string | null {
  // Match both property="..." and name="..." attributes
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractJsonLdText(html: string): string | null {
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
  if (!jsonLdMatch?.[1]) return null

  try {
    const data = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>
    // Try common fields
    return (
      (typeof data.description === "string" ? data.description : null) ??
      (typeof data.articleBody === "string" ? data.articleBody : null) ??
      (typeof data.name === "string" ? data.name : null) ??
      null
    )
  } catch {
    return null
  }
}

async function readViaOpenGraph(url: string): Promise<SocialContent | null> {
  let html: string | null = null

  try {
    const res = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Skinory/1.0; +https://skinory.app)",
        Accept: "text/html",
      },
    })
    if (res.ok) html = await res.text()
  } catch {
    // Direct fetch failed — will try ScrapingBee below
  }

  // ScrapingBee fallback when direct fetch fails
  if (!html) {
    console.warn(`[social-content-reader] Direct OG fetch failed for ${url}, trying ScrapingBee`)
    html = await fetchViaScrapingBee(url)
  }

  if (!html) return null

  try {

    const ogTitle = extractMetaContent(html, "og:title")
    const ogDescription = extractMetaContent(html, "og:description")
    const ogImage = extractMetaContent(html, "og:image")
    const twitterTitle = extractMetaContent(html, "twitter:title")
    const twitterDescription = extractMetaContent(html, "twitter:description")
    const jsonLdText = extractJsonLdText(html)

    const text = ogDescription ?? twitterDescription ?? ogTitle ?? twitterTitle ?? jsonLdText ?? ""
    const thumbnail = ogImage ?? extractMetaContent(html, "twitter:image") ?? null

    // Try to find author from meta tags
    const author =
      extractMetaContent(html, "author") ??
      extractMetaContent(html, "twitter:creator") ??
      null

    if (!text && !thumbnail) return null

    return {
      text,
      author,
      thumbnail,
      metadata: {
        ogTitle,
        ogDescription,
        ogImage,
      },
    }
  } catch {
    return null
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function readSocialContent(platform: Platform, url: string): Promise<SocialContent> {
  // Try oEmbed first (structured, reliable when available)
  const oembed = await readViaOEmbed(platform, url)
  if (oembed && oembed.text) return oembed

  // Fallback to OG tag scraping
  const og = await readViaOpenGraph(url)
  if (og) return og

  // If oEmbed returned partial data but no text, still return it
  if (oembed) return oembed

  return EMPTY_CONTENT
}
