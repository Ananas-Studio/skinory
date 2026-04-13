// ─── Social Product Matcher ──────────────────────────────────────────────────
// Matches LLM-detected products against the internal Product + Brand database.
// Strategy: exact slug match → ILIKE fuzzy match.

import { Op } from "sequelize"
import { getModels } from "../../models/index.js"
import type { DetectedProduct } from "./social-product-detector.js"

export type MatchType = "exact" | "fuzzy" | "possible"

export interface ProductMatch {
  productId: string
  brand: string | null
  name: string
  imageUrl: string | null
  matchType: MatchType
  confidence: number
}

// ─── Slug helper ─────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function matchProducts(detected: DetectedProduct[]): Promise<ProductMatch[]> {
  if (detected.length === 0) return []

  const { Product, Brand } = getModels()
  const matches: ProductMatch[] = []
  const seenProductIds = new Set<string>()

  for (const dp of detected) {
    const searchName = dp.name?.trim()
    const searchBrand = dp.brand?.trim()
    if (!searchName && !searchBrand) continue

    // ── 1. Exact slug match ──────────────────────────────────────────────

    if (searchName) {
      const slug = toSlug(searchName)
      const exact = await Product.findOne({
        where: { slug },
        include: [{ model: Brand, as: "brand" }],
      })

      if (exact && !seenProductIds.has(exact.id)) {
        seenProductIds.add(exact.id)
        const brand = (exact as unknown as { brand?: { name: string } }).brand
        matches.push({
          productId: exact.id,
          brand: brand?.name ?? null,
          name: exact.name,
          imageUrl: exact.imageUrl ?? null,
          matchType: "exact",
          confidence: dp.confidence,
        })
        continue
      }
    }

    // ── 2. Fuzzy ILIKE match ─────────────────────────────────────────────

    const conditions: Record<string, unknown>[] = []

    if (searchName) {
      conditions.push({ name: { [Op.iLike]: `%${searchName}%` } })
    }

    if (conditions.length === 0 && searchBrand) {
      // Only brand, no product name — find products by brand
      const brand = await Brand.findOne({
        where: { name: { [Op.iLike]: `%${searchBrand}%` } },
      })
      if (brand) {
        conditions.push({ brandId: brand.id })
      }
    }

    if (conditions.length > 0) {
      const fuzzyResults = await Product.findAll({
        where: { [Op.or]: conditions },
        include: [{ model: Brand, as: "brand" }],
        limit: 3,
      })

      for (const product of fuzzyResults) {
        if (seenProductIds.has(product.id)) continue
        seenProductIds.add(product.id)

        const brand = (product as unknown as { brand?: { name: string } }).brand

        // Determine match confidence
        const nameMatch = searchName
          ? product.name.toLowerCase().includes(searchName.toLowerCase())
          : false
        const brandMatch = searchBrand && brand
          ? brand.name.toLowerCase().includes(searchBrand.toLowerCase())
          : false

        const matchType: MatchType = nameMatch && brandMatch ? "fuzzy" : "possible"
        const adjustedConfidence = matchType === "fuzzy"
          ? dp.confidence * 0.85
          : dp.confidence * 0.6

        matches.push({
          productId: product.id,
          brand: brand?.name ?? null,
          name: product.name,
          imageUrl: product.imageUrl ?? null,
          matchType,
          confidence: Math.round(adjustedConfidence * 100) / 100,
        })
      }
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence)
  return matches
}
