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
  return (
    lower.includes("captcha") ||
    lower.includes("robot check") ||
    lower.includes("automated access") ||
    lower.includes("güvenlik</title>") || // Hepsiburada Akamai block page
    lower.includes("akamaigh")
  )
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

// ─── Hepsiburada URL slug fallback ──────────────────────────────────────────
// Hepsiburada uses aggressive Akamai bot protection that blocks all server-side
// fetches (403 "Güvenlik" page). When HTML fetch fails, we extract product info
// from the URL slug which is always available and contains the product name.

/** Known Turkish cosmetics / skincare brand names for matching from URL slugs */
const KNOWN_BRANDS = [
  "cerave", "la roche posay", "the ordinary", "neutrogena", "nivea", "bioderma",
  "vichy", "avene", "eucerin", "uriage", "svr", "nuxe", "garnier", "loreal",
  "maybelline", "clinique", "estee lauder", "lancome", "mac", "nars", "bobbi brown",
  "kiehl", "origins", "shiseido", "sk-ii", "clarins", "sisley", "dior", "chanel",
  "ysl", "givenchy", "guerlaim", "tom ford", "jo malone", "byredo", "diptyque",
  "murad", "drunk elephant", "paula", "cosrx", "innisfree", "laneige", "sulwhasoo",
  "missha", "etude", "holika", "some by mi", "axis-y", "purito", "klairs",
  "hada labo", "rohto", "biore", "canmake", "kate", "cezanne", "anessa",
  "dove", "head shoulders", "pantene", "herbal essences", "tresemme",
  "elseve", "gliss", "schwarzkopf", "wella", "phyto", "klorane", "rene furterer",
  "himalaya", "sebamed", "aveeno", "johnsons", "mustela", "weleda", "bepanthen",
  "bepanthol", "pierre fabre", "ducray", "a-derma",
]

function extractProductFromSlug(url: string): EcommerceProduct {
  const product: EcommerceProduct = { ...EMPTY_PRODUCT, url }

  // URL format: hepsiburada.com/product-name-slug-pm-SKU
  // Extract slug: everything between last / and -pm-
  const pathMatch = url.match(/hepsiburada\.com\/([^?#]+?)(?:-pm-[A-Z0-9]+)?(?:\?|#|$)/i)
  if (!pathMatch?.[1]) return product

  const slug = pathMatch[1]

  // Convert slug to readable name: replace hyphens with spaces, title-case
  const words = slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!words) return product

  // Title case
  product.name = words
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

  // Try to detect brand from known brands list
  const lowerWords = words.toLowerCase()
  for (const brand of KNOWN_BRANDS) {
    if (lowerWords.startsWith(brand)) {
      product.brand = brand
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
      break
    }
  }

  // Extract size from slug if present and append to name (e.g., "236-ml")
  const sizeMatch = slug.match(/(\d+)\s*-?\s*(ml|gr|g|oz|l|mg|cc)\b/i)
  if (sizeMatch) {
    const size = `${sizeMatch[1]} ${sizeMatch[2]}`
    if (product.name && !product.name.toLowerCase().includes(size.toLowerCase())) {
      product.name = `${product.name} ${size}`
    }
  }

  console.info(`[ecommerce-content-reader] Hepsiburada: extracted from URL slug: ${product.name}`)
  return product
}

async function fetchHepsiburadaWithFallback(
  originalUrl: string,
): Promise<{ html: string | null; slugProduct: EcommerceProduct | null }> {
  // Strategy 1: try crawler UA (may work from Azure/cloud IPs)
  const html = await fetchPage(originalUrl, { useCrawlerUA: true })
  if (html && !isBotDetectionPage(html)) return { html, slugProduct: null }

  // Strategy 2: try browser UA (fallback)
  const htmlBrowser = await fetchPage(originalUrl)
  if (htmlBrowser && !isBotDetectionPage(htmlBrowser)) return { html: htmlBrowser, slugProduct: null }

  // Strategy 3: extract product info from URL slug (always works)
  console.warn(`[ecommerce-content-reader] Hepsiburada HTML fetch blocked, falling back to URL slug extraction`)
  const slugProduct = extractProductFromSlug(originalUrl)
  if (slugProduct.name) return { html: null, slugProduct }

  return { html: null, slugProduct: null }
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

function extractNoon(html: string, url: string): EcommerceProduct {
  const product = extractGeneric(html, url)

  // Noon embeds product data in __NEXT_DATA__ (Next.js SSR payload)
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch?.[1]) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
      const props = nextData.props as Record<string, unknown> | undefined
      const pageProps = props?.pageProps as Record<string, unknown> | undefined
      const catalog = pageProps?.catalog as Record<string, unknown> | undefined
      const productData = catalog?.product as Record<string, unknown> | undefined

      if (productData) {
        if (typeof productData.name === "string" && productData.name) product.name = productData.name
        if (typeof productData.brand === "string" && productData.brand) product.brand = productData.brand
        if (typeof productData.image_key === "string" && productData.image_key) {
          product.imageUrl = `https://f.nooncdn.com/p/${productData.image_key}.jpg`
        }

        // Price from variants
        const variants = productData.variants as Record<string, unknown>[] | undefined
        if (variants?.[0]) {
          const offer = variants[0].offers as Record<string, unknown>[] | undefined
          if (offer?.[0]) {
            if (typeof offer[0].price === "number") product.price = String(offer[0].price)
            if (typeof offer[0].price === "string") product.price = offer[0].price
            if (typeof offer[0].currency === "string") product.currency = offer[0].currency
          }
        }
      }
    } catch {
      // Malformed __NEXT_DATA__ — use OG fallback
    }
  }

  // Noon-specific: brand from og:title (format: "Product Name | Brand | noon")
  if (!product.brand && product.name) {
    const ogTitle = extractMeta(html, "og:title") ?? ""
    const parts = ogTitle.split("|").map((s) => s.trim())
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]!
      if (candidate.toLowerCase() !== "noon" && candidate.toLowerCase() !== "نون") {
        product.brand = candidate
      }
    }
  }

  // Noon description may contain ingredients
  if (product.description && !product.ingredientsText) {
    const lower = product.description.toLowerCase()
    if (lower.includes("ingredient")) {
      product.ingredientsText = product.description
    }
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

// ─── Noon API fallback ───────────────────────────────────────────────────────
// Noon product pages are JS-rendered (Next.js) and may not return useful HTML
// to server-side fetches. The catalog API endpoint returns JSON product data
// and is less restrictive.

function extractNoonSku(url: string): string | null {
  const m = url.match(/\/([NZ]\d{6,12}[A-Z]?)(?:\/p\/?|\/?\?|\/?$)/)
  return m?.[1] ?? null
}

function extractNoonLocale(url: string): string {
  const m = url.match(/noon\.com\/([a-z]{2,3}-[a-z]{2})\//i)
  return m?.[1] ?? "uae-en"
}

interface NoonApiProduct {
  name?: string
  brand?: string
  image_key?: string
  price?: number
  currency?: string
  description?: string
}

async function fetchNoonFromApi(sku: string, locale: string, url: string): Promise<EcommerceProduct | null> {
  const apiUrls = [
    `https://www.noon.com/_svc/catalog/api/v3/u/product/${sku}?locale=${locale}`,
    `https://www.noon.com/_svc/catalog/api/v3/u/product/${sku}?locale=en-ae`,
  ]

  for (const apiUrl of apiUrls) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": randomUA(),
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      })
      clearTimeout(timer)
      if (!res.ok) continue

      const json = await res.json() as Record<string, unknown>
      const productData = (json.product ?? json.data ?? json) as NoonApiProduct

      if (!productData?.name) continue

      const product: EcommerceProduct = { ...EMPTY_PRODUCT, url }
      product.name = productData.name ?? null
      product.brand = productData.brand ?? null
      if (productData.image_key) {
        product.imageUrl = `https://f.nooncdn.com/p/${productData.image_key}.jpg`
      }
      if (productData.price !== undefined) product.price = String(productData.price)
      if (productData.currency) product.currency = productData.currency
      if (productData.description) product.description = productData.description

      console.info(`[ecommerce-content-reader] Got noon product from API: ${product.name}`)
      return product
    } catch {
      // Try next URL
    }
  }

  return null
}

async function fetchNoonWithFallback(originalUrl: string): Promise<{ html: string | null; apiProduct: EcommerceProduct | null }> {
  // Strategy 1: try crawler UA to get SSR HTML with OG tags
  const html = await fetchPage(originalUrl, { useCrawlerUA: true })
  if (html && !isBotDetectionPage(html)) return { html, apiProduct: null }

  // Strategy 2: direct page fetch with browser UA
  const htmlBrowser = await fetchPage(originalUrl)
  if (htmlBrowser) return { html: htmlBrowser, apiProduct: null }

  // Strategy 3: Noon catalog API
  const sku = extractNoonSku(originalUrl)
  if (sku) {
    const locale = extractNoonLocale(originalUrl)
    console.warn(`[ecommerce-content-reader] Noon HTML fetch failed, trying API for SKU ${sku}`)
    const apiProduct = await fetchNoonFromApi(sku, locale, originalUrl)
    if (apiProduct?.name) return { html: null, apiProduct }
  }

  return { html: null, apiProduct: null }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const PLATFORM_EXTRACTORS: Partial<
  Record<Platform, (html: string, url: string) => EcommerceProduct>
> = {
  amazon: extractAmazon,
  trendyol: extractTrendyol,
  hepsiburada: extractHepsiburada,
  watsons: extractWatsons,
  noon: extractNoon,
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

  if (platform === "hepsiburada") {
    // Hepsiburada uses Akamai bot protection — try HTML fetch, fall back to URL slug
    const { html, slugProduct } = await fetchHepsiburadaWithFallback(url)
    if (slugProduct) {
      if (slugProduct.name) slugProduct.name = decodeHtmlEntities(slugProduct.name).trim()
      if (slugProduct.brand) slugProduct.brand = decodeHtmlEntities(slugProduct.brand).trim()
      return slugProduct
    }
    if (!html) return { ...EMPTY_PRODUCT, url }
    const product = extractHepsiburada(html, url)
    if (product.name) product.name = decodeHtmlEntities(product.name).trim()
    if (product.brand) product.brand = decodeHtmlEntities(product.brand).trim()
    if (product.description) product.description = decodeHtmlEntities(product.description).trim()
    return product
  }

  if (platform === "noon") {
    // Noon is JS-rendered (Next.js) — try HTML fetch, then catalog API fallback
    const { html, apiProduct } = await fetchNoonWithFallback(url)
    if (apiProduct) {
      if (apiProduct.name) apiProduct.name = decodeHtmlEntities(apiProduct.name).trim()
      if (apiProduct.brand) apiProduct.brand = decodeHtmlEntities(apiProduct.brand).trim()
      return apiProduct
    }
    if (!html) return { ...EMPTY_PRODUCT, url }
    const product = extractNoon(html, url)
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
