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

const BROWSER_USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
]

// Social media / search engine crawler UAs — sites typically serve full HTML to these
const CRAWLER_USER_AGENTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
]

function randomUA(): string {
  return BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)]!
}

function randomCrawlerUA(): string {
  return CRAWLER_USER_AGENTS[Math.floor(Math.random() * CRAWLER_USER_AGENTS.length)]!
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000
const MAX_RETRIES = 1  // Keep retries low to speed up fallback to search strategy

interface FetchOptions {
  useCrawlerUA?: boolean
}

function buildHeaders(opts?: FetchOptions): Record<string, string> {
  if (opts?.useCrawlerUA) {
    return {
      "User-Agent": randomCrawlerUA(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    }
  }
  return {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  }
}

function isBotDetectionPage(html: string): boolean {
  if (html.length < 5000) return true
  const lower = html.toLowerCase()
  return lower.includes("captcha") || lower.includes("robot check") || lower.includes("automated access")
}

async function fetchPage(url: string, opts?: FetchOptions): Promise<string | null> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: buildHeaders(opts),
      })
      clearTimeout(timer)
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`)
        console.warn(`[ecommerce-content-reader] HTTP ${res.status} for ${url} (attempt ${attempt + 1})`)
        continue
      }
      const html = await res.text()
      if (isBotDetectionPage(html)) {
        console.warn(`[ecommerce-content-reader] Bot detection page for ${url} (attempt ${attempt + 1}, size=${html.length})`)
        lastError = new Error("Bot detection page received")
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
        }
        continue
      }
      return html
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
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

// ─── Amazon fallback via search page ─────────────────────────────────────────
// Amazon product pages aggressively block datacenter IPs. Search result pages
// are far less restrictive. When the product page is blocked, search for the
// ASIN and extract product info from the search results HTML.

const AMAZON_FALLBACK_DOMAINS = [
  "www.amazon.com",
  "www.amazon.co.uk",
  "www.amazon.de",
  "www.amazon.com.tr",
]

function extractAsin(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/)
  return m?.[1] ?? null
}

// ─── Amazon search-page scraping ─────────────────────────────────────────────

function extractAmazonSearchResult(html: string, asin: string, url: string): EcommerceProduct | null {
  const product: EcommerceProduct = { ...EMPTY_PRODUCT, url }

  const h2Regex = new RegExp(
    `href="[^"]*/${asin}/[^"]*"[\\s\\S]*?<h2[^>]*aria-label="([^"]+)"`,
    "i"
  )
  const h2Match = html.match(h2Regex)
  if (h2Match?.[1]) {
    product.name = decodeHtmlEntities(h2Match[1])
  }

  if (!product.name) {
    const spanRegex = new RegExp(
      `/${asin}/[\\s\\S]*?<span[^>]*class="[^"]*a-text-normal[^"]*"[^>]*>([\\s\\S]*?)</span>`,
      "i"
    )
    const spanMatch = html.match(spanRegex)
    if (spanMatch?.[1]) {
      product.name = decodeHtmlEntities(stripHtmlTags(spanMatch[1]).trim())
    }
  }

  if (!product.name) return null

  const imgRegex = new RegExp(
    `data-image-source-density="1"[^>]*src="(https://m\\.media-amazon\\.com/images/I/[^"]+)"`,
    "i"
  )
  const imgMatch = html.match(imgRegex)
  if (imgMatch?.[1]) {
    product.imageUrl = imgMatch[1].replace(/_AC_[^.]+\./, "_AC_SL1500_.")
  }

  const priceWhole = html.match(/a-price-whole">(\d[\d,]*)</)
  const priceFraction = html.match(/a-price-fraction">(\d+)</)
  if (priceWhole?.[1]) {
    const fraction = priceFraction?.[1] ?? "00"
    product.price = `${priceWhole[1].replace(/,/g, "")}.${fraction}`
  }

  const brandRegex = new RegExp(
    `/${asin}/[\\s\\S]*?<span[^>]*class="[^"]*a-size-base-plus[^"]*"[^>]*>([^<]+)</span>`,
    "i"
  )
  const brandMatch = html.match(brandRegex)
  if (brandMatch?.[1]) {
    product.brand = decodeHtmlEntities(brandMatch[1].trim())
  }

  return product
}

// ─── Amazon fallback orchestrator ────────────────────────────────────────────

async function fetchAmazonWithFallback(originalUrl: string): Promise<{ html: string | null; searchProduct: EcommerceProduct | null }> {
  // Strategy 1: direct product page fetch
  const html = await fetchPage(originalUrl)
  if (html) return { html, searchProduct: null }

  // Strategy 2: Amazon search page scraping (less protected than product pages)
  const asin = extractAsin(originalUrl)
  if (!asin) return { html: null, searchProduct: null }

  console.warn(`[ecommerce-content-reader] Direct fetch blocked, trying Amazon search pages for ASIN ${asin}`)
  for (const domain of ["www.amazon.com", ...AMAZON_FALLBACK_DOMAINS]) {
    if (domain === "www.amazon.com" || !originalUrl.includes(domain)) {
      const searchUrl = `https://${domain}/s?k=${asin}`
      const searchHtml = await fetchPage(searchUrl)
      if (searchHtml) {
        const searchProduct = extractAmazonSearchResult(searchHtml, asin, originalUrl)
        if (searchProduct?.name) {
          console.info(`[ecommerce-content-reader] Got product from ${domain} search: ${searchProduct.name}`)
          return { html: null, searchProduct }
        }
      }
    }
  }

  return { html: null, searchProduct: null }
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
  if (platform === "amazon") {
    // Amazon uses multi-strategy fallback: direct page → search results
    const { html, searchProduct } = await fetchAmazonWithFallback(url)
    if (searchProduct) {
      // Got product from search results — already extracted
      if (searchProduct.name) searchProduct.name = decodeHtmlEntities(searchProduct.name).trim()
      if (searchProduct.brand) searchProduct.brand = decodeHtmlEntities(searchProduct.brand).trim()
      return searchProduct
    }
    if (!html) return { ...EMPTY_PRODUCT, url }
    const product = extractAmazon(html, url)
    if (product.name) product.name = decodeHtmlEntities(product.name).trim()
    if (product.brand) product.brand = decodeHtmlEntities(product.brand).trim()
    if (product.description) product.description = decodeHtmlEntities(product.description).trim()
    return product
  }

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
