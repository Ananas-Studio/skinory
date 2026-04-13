// ─── Social Product Enricher ─────────────────────────────────────────────────
// For each LLM-detected product, searches both the internal database and
// Open Beauty Facts in parallel, then merges into a unified result list.

import type { DetectedProduct } from "./social-product-detector.js"
import { matchProducts, type ProductMatch } from "./social-product-matcher.js"
import { searchObfByName, type ObfProduct } from "../obf-client.js"

// ─── Public types ────────────────────────────────────────────────────────────

export interface ObfProductInfo {
  productName: string
  brands: string | null
  imageUrl: string | null
  ingredientsText: string | null
  categories: string | null
}

export interface EnrichedProduct {
  source: "internal" | "obf"
  /** Internal product ID — only present for source=internal */
  productId: string | null
  brand: string | null
  name: string
  imageUrl: string | null
  confidence: number
  matchType: string | null
  /** OBF data — only present for source=obf */
  obfData: ObfProductInfo | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function obfToInfo(p: ObfProduct): ObfProductInfo {
  return {
    productName: p.product_name ?? "Unknown",
    brands: p.brands ?? null,
    imageUrl: p.image_url ?? null,
    ingredientsText: p.ingredients_text ?? null,
    categories: p.categories ?? null,
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function enrichProducts(
  detected: DetectedProduct[],
): Promise<EnrichedProduct[]> {
  if (detected.length === 0) return []

  // ── Run DB match + OBF search in parallel ──────────────────────────────
  const obfQueries = detected
    .map((dp) => [dp.brand, dp.name].filter(Boolean).join(" "))
    .filter((q) => q.length > 0)

  const [dbMatches, ...obfResults] = await Promise.all([
    matchProducts(detected),
    ...obfQueries.map((q) => searchObfByName(q, 3)),
  ])

  // ── Build enriched list from DB matches first ──────────────────────────
  const enriched: EnrichedProduct[] = []
  const seenKeys = new Set<string>()

  for (const m of dbMatches) {
    const key = normalize(m.name)
    seenKeys.add(key)
    enriched.push({
      source: "internal",
      productId: m.productId,
      brand: m.brand,
      name: m.name,
      imageUrl: m.imageUrl,
      confidence: m.confidence,
      matchType: m.matchType,
      obfData: null,
    })
  }

  // ── Append OBF-only products (not already matched in DB) ───────────────
  const allObfProducts = obfResults.flat()
  for (const obf of allObfProducts) {
    if (!obf.product_name) continue
    const key = normalize(obf.product_name)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    enriched.push({
      source: "obf",
      productId: null,
      brand: obf.brands ?? null,
      name: obf.product_name,
      imageUrl: obf.image_url ?? null,
      confidence: 0.5,
      matchType: null,
      obfData: obfToInfo(obf),
    })
  }

  return enriched
}
