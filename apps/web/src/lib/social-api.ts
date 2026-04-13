const API_BASE = '/api/social'

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetectedProduct {
  brand: string | null
  name: string | null
  confidence: number
}

export interface ScrapeResult {
  platform: string
  resourceType: string | null
  preview: {
    text: string | null
    author: string | null
    thumbnail: string | null
  }
}

export interface DetectResult {
  detectedProducts: DetectedProduct[]
}

export interface ObfProductInfo {
  productName: string
  brands: string | null
  imageUrl: string | null
  ingredientsText: string | null
  categories: string | null
}

export interface EnrichedProduct {
  source: 'internal' | 'obf'
  productId: string | null
  brand: string | null
  name: string
  imageUrl: string | null
  confidence: number
  matchType: string | null
  obfData: ObfProductInfo | null
}

export interface EnrichResult {
  products: EnrichedProduct[]
}

// ─── Step 1: Scrape social link ──────────────────────────────────────────────

export async function scrapeLink(
  userId: string,
  url: string,
): Promise<ScrapeResult> {
  const res = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ url }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to read social post')
  }

  return json.data as ScrapeResult
}

// ─── Step 2: Detect products from text ───────────────────────────────────────

export async function detectProducts(
  userId: string,
  text: string,
): Promise<DetectResult> {
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ text }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to detect products')
  }

  return json.data as DetectResult
}

// ─── Step 3: Enrich detected products (DB + OBF) ────────────────────────────

export async function enrichDetectedProducts(
  userId: string,
  products: DetectedProduct[],
): Promise<EnrichResult> {
  const res = await fetch(`${API_BASE}/enrich`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ products }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to enrich product data')
  }

  return json.data as EnrichResult
}
