// ─── E-Commerce Content Reader ───────────────────────────────────────────────
// Fetches product information from e-commerce product pages using OpenGraph
// tags, JSON-LD Product schema, and platform-specific HTML extraction.

import type { Platform } from "./social-link-parser.js"

// ─── Public types ────────────────────────────────────────────────────────────

export interface EcommerceProduct {
  name: string | null
  brand: string | null
  description: string | null
  imageUrl: string | null
  ingredientsText: string | null
  price: string | null
  currency: string | null
  category: string | null
  url: string
}

const EMPTY_PRODUCT: EcommerceProduct = {
  name: null,
  brand: null,
  description: null,
  imageUrl: null,
  ingredientsText: null,
  price: null,
  currency: null,
  category: null,
  url: "",
}

// ─── User-Agent rotation ─────────────────────────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2

async function fetchPage(url: string): Promise<string | null> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": randomUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "identity",
          "Cache-Control": "no-cache",
        },
      })
      clearTimeout(timer)
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`)
        continue
      }
      return await res.text()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
    }
  }
  console.error("[ecommerce-content-reader] Fetch failed:", lastError)
  return null
}

// ─── HTML extraction utilities ───────────────────────────────────────────────

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1])
  }
  return null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractJsonLdProducts(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]!)
      if (Array.isArray(data)) {
        for (const item of data) {
          if (isProductJsonLd(item)) results.push(item as Record<string, unknown>)
        }
      } else if (isProductJsonLd(data)) {
        results.push(data as Record<string, unknown>)
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  }
  return results
}

function isProductJsonLd(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false
  const obj = data as Record<string, unknown>
  const type = String(obj["@type"] ?? "")
  return type === "Product" || type === "IndividualProduct"
}

function extractBetween(html: string, startMarker: string, endMarker: string): string | null {
  const startIdx = html.indexOf(startMarker)
  if (startIdx === -1) return null
  const contentStart = startIdx + startMarker.length
  const endIdx = html.indexOf(endMarker, contentStart)
  if (endIdx === -1) return null
  return html.slice(contentStart, endIdx).trim()
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim()
}

// ─── Generic OG + JSON-LD extraction ─────────────────────────────────────────

function extractGeneric(html: string, url: string): EcommerceProduct {
  const product: EcommerceProduct = { ...EMPTY_PRODUCT, url }

  // OG tags
  product.name = extractMeta(html, "og:title") ?? extractMeta(html, "twitter:title")
  product.description = extractMeta(html, "og:description") ?? extractMeta(html, "twitter:description")
  product.imageUrl = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image")

  // JSON-LD Product
  const jsonLdProducts = extractJsonLdProducts(html)
  if (jsonLdProducts.length > 0) {
    const ld = jsonLdProducts[0]!
    if (!product.name && typeof ld.name === "string") product.name = ld.name
    if (typeof ld.description === "string") product.description = ld.description
    if (!product.imageUrl && typeof ld.image === "string") product.imageUrl = ld.image
    if (Array.isArray(ld.image) && typeof ld.image[0] === "string") product.imageUrl = ld.image[0]

    // Brand from JSON-LD
    const brand = ld.brand as Record<string, unknown> | undefined
    if (brand && typeof brand.name === "string") product.brand = brand.name

    // Price from JSON-LD offers
    const offers = ld.offers as Record<string, unknown> | Record<string, unknown>[] | undefined
    if (offers) {
      const offer = Array.isArray(offers) ? offers[0] : offers
      if (offer && typeof offer.price === "string") product.price = offer.price
      if (offer && typeof offer.price === "number") product.price = String(offer.price)
      if (offer && typeof offer.priceCurrency === "string") product.currency = offer.priceCurrency
    }

    // Category from JSON-LD
    if (typeof ld.category === "string") product.category = ld.category
  }

  return product
}

// ─── Platform-specific extractors ────────────────────────────────────────────

function extractAmazon(html: string, url: string): EcommerceProduct {
  const product = extractGeneric(html, url)

  // Amazon-specific: product title — extract text content of the #productTitle span
  const titleMatch = html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/)
  if (titleMatch?.[1]) {
    const cleaned = stripHtmlTags(titleMatch[1]).trim()
    if (cleaned) product.name = cleaned
  }

  // Amazon-specific: brand
  const bylineMatch = html.match(/id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/)
  if (bylineMatch?.[1]) {
    const brandText = stripHtmlTags(bylineMatch[1])
      .replace(/^(Visit the |Brand: |Marka: )/, "")
      .replace(/ Store$/, "")
      .trim()
    if (brandText) product.brand = brandText
  }

  // Fallback brand from meta
  if (!product.brand) {
    const metaBrand = extractMeta(html, "brand")
    if (metaBrand) product.brand = metaBrand
  }

  // Amazon image: data-old-hires on main image, or landingImage src
  if (!product.imageUrl) {
    const hiresMatch = html.match(/data-old-hires="([^"]+)"/)
    if (hiresMatch?.[1]) {
      product.imageUrl = hiresMatch[1]
    } else {
      const imgMatch = html.match(/id="landingImage"[^>]*src="([^"]+)"/)
      if (imgMatch?.[1]) product.imageUrl = imgMatch[1]
    }
  }

  // Amazon price
  if (!product.price) {
    const priceWhole = html.match(/a-price-whole">(\d[\d,]*)</)
    const priceFraction = html.match(/a-price-decimal">\.\s*<\/span><span[^>]*>(\d+)/)
    if (priceWhole?.[1]) {
      const fraction = priceFraction?.[1] ?? "00"
      product.price = `${priceWhole[1].replace(/,/g, "")}.${fraction}`
    }
  }

  // Amazon currency from price symbol
  if (!product.currency) {
    const symbolMatch = html.match(/a-price-symbol">([^<]+)</)
    if (symbolMatch?.[1]) {
      const sym = symbolMatch[1].trim()
      const currencyMap: Record<string, string> = {
        "AED": "AED", "₺": "TRY", "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY",
        "TL": "TRY", "SAR": "SAR", "S$": "SGD", "A$": "AUD", "C$": "CAD",
      }
      product.currency = currencyMap[sym] ?? sym
    }
  }

  // Amazon ingredient info (sometimes in important-information section)
  const ingredientSection = extractBetween(html, 'id="important-information"', "</div>")
  if (ingredientSection) {
    const text = stripHtmlTags(ingredientSection)
    if (text.toLowerCase().includes("ingredient")) {
      product.ingredientsText = text
    }
  }

  return product
}

function extractTrendyol(html: string, url: string): EcommerceProduct {
  const product = extractGeneric(html, url)

  // Trendyol embeds product data in a script tag
  const stateMatch = html.match(/window\.__PRODUCT_DETAIL_APP_INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/)
  if (stateMatch?.[1]) {
    try {
      const state = JSON.parse(stateMatch[1]) as Record<string, unknown>
      const productData = state.product as Record<string, unknown> | undefined
      if (productData) {
        if (typeof productData.name === "string") product.name = productData.name
        if (typeof productData.brand === "object" && productData.brand !== null) {
          const brand = productData.brand as Record<string, unknown>
          if (typeof brand.name === "string") product.brand = brand.name
        }
        if (typeof productData.description === "string") {
          product.description = stripHtmlTags(productData.description)
        }
        if (typeof productData.category === "object" && productData.category !== null) {
          const cat = productData.category as Record<string, unknown>
          if (typeof cat.name === "string") product.category = cat.name
        }
      }
    } catch {
      // Malformed state — use OG fallback
    }
  }

  // Trendyol brand from OG title (format: "Product Name - Brand | Trendyol")
  if (!product.brand && product.name) {
    const ogTitle = extractMeta(html, "og:title") ?? ""
    const pipeIdx = ogTitle.lastIndexOf("|")
    const dashIdx = ogTitle.lastIndexOf(" - ")
    if (pipeIdx > 0 && dashIdx > 0 && dashIdx < pipeIdx) {
      const brand = ogTitle.slice(dashIdx + 3, pipeIdx).trim()
      if (brand && brand.toLowerCase() !== "trendyol") product.brand = brand
    }
  }

  return product
}

function extractHepsiburada(html: string, url: string): EcommerceProduct {
  const product = extractGeneric(html, url)

  // Hepsiburada brand from breadcrumb or OG title
  if (!product.brand && product.name) {
    const ogTitle = extractMeta(html, "og:title") ?? ""
    // Format: "Product Name Fiyatı, Yorumları - Hepsiburada"
    // Brand is often the first word(s)
    const brandMeta = extractMeta(html, "product:brand")
    if (brandMeta) product.brand = brandMeta
  }

  return product
}

function extractWatsons(html: string, url: string): EcommerceProduct {
  const product = extractGeneric(html, url)

  // Watsons brand from meta
  if (!product.brand) {
    const brandMeta = extractMeta(html, "product:brand")
    if (brandMeta) product.brand = brandMeta
  }

  return product
}

// ─── Public API ──────────────────────────────────────────────────────────────

const PLATFORM_EXTRACTORS: Partial<
  Record<Platform, (html: string, url: string) => EcommerceProduct>
> = {
  amazon: extractAmazon,
  trendyol: extractTrendyol,
  hepsiburada: extractHepsiburada,
  watsons: extractWatsons,
  // gratis and sevil use generic extraction
}

export async function readEcommerceProduct(
  platform: Platform,
  url: string,
): Promise<EcommerceProduct> {
  const html = await fetchPage(url)
  if (!html) return { ...EMPTY_PRODUCT, url }

  const extractor = PLATFORM_EXTRACTORS[platform] ?? extractGeneric
  const product = extractor(html, url)

  // Final cleanup: trim and decode HTML entities in all string fields
  if (product.name) product.name = decodeHtmlEntities(product.name).trim()
  if (product.brand) product.brand = decodeHtmlEntities(product.brand).trim()
  if (product.description) product.description = decodeHtmlEntities(product.description).trim()

  return product
}
