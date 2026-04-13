// ─── Social Product Enricher ─────────────────────────────────────────────────
// For each LLM-detected product, searches both the internal database and
// Open Beauty Facts in parallel, then merges into a unified result list.
// OBF-only products are persisted as Product records, and Scan records are
// created for every enriched product so they appear in the user's history.

import { type Transaction } from "sequelize"
import type { DetectedProduct } from "./social-product-detector.js"
import { matchProducts, type ProductMatch } from "./social-product-matcher.js"
import { searchObfByName, type ObfProduct } from "../obf-client.js"
import { sequelize } from "../../config/database.js"
import { getModels } from "../../models/index.js"
import { slugify } from "../product-lookup.service.js"
import { parseIngredientString } from "@skinory/core"

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
  /** Product ID — present for both internal and persisted OBF products */
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

function extractCategory(categories: string | undefined): "skincare" | "makeup" | "supplement" | "other" {
  if (!categories) return "other"
  const lower = categories.toLowerCase()
  if (lower.includes("skincare") || lower.includes("skin care") || lower.includes("moisturizer") || lower.includes("cleanser") || lower.includes("serum")) return "skincare"
  if (lower.includes("makeup") || lower.includes("cosmetic") || lower.includes("foundation") || lower.includes("lipstick")) return "makeup"
  if (lower.includes("supplement") || lower.includes("vitamin")) return "supplement"
  return "other"
}

// ─── Persist OBF product → Product + Brand + Ingredients ─────────────────────

async function persistObfProduct(
  obf: ObfProduct,
  transaction: Transaction,
): Promise<string> {
  const { Brand, Product, Ingredient, ProductIngredient } = getModels()

  const productName = obf.product_name?.trim() || "Unknown Product"
  const brandName = obf.brands?.split(",")[0]?.trim() || null
  const imageUrl = obf.image_url?.trim() || null
  const rawIngredientsText = obf.ingredients_text?.trim() || null
  const category = extractCategory(obf.categories)

  // Brand
  let brandId: string | null = null
  if (brandName) {
    const brandSlug = slugify(brandName)
    if (brandSlug) {
      const [brand] = await Brand.findOrCreate({
        where: { slug: brandSlug },
        defaults: { name: brandName, slug: brandSlug },
        transaction,
      })
      brandId = brand.id
    }
  }

  // Product (findOrCreate by slug to avoid duplicates across enrichments)
  const productSlug = slugify(productName) || `social-${Date.now()}`
  const [product] = await Product.findOrCreate({
    where: { slug: productSlug },
    defaults: {
      name: productName,
      brandId,
      slug: productSlug,
      category,
      imageUrl,
      sourceType: "url_scrape",
      sourceConfidence: "0.5000",
    },
    transaction,
  })

  // Ingredients (if available)
  if (rawIngredientsText) {
    const parsed = parseIngredientString(rawIngredientsText)
    for (const item of parsed.ingredients) {
      const [ingredient] = await Ingredient.findOrCreate({
        where: { inciName: item.inciName },
        defaults: { inciName: item.inciName, displayName: item.rawLabel },
        transaction,
      })

      await ProductIngredient.findOrCreate({
        where: { productId: product.id, ingredientId: ingredient.id },
        defaults: {
          productId: product.id,
          ingredientId: ingredient.id,
          ingredientOrder: item.order,
          rawLabel: item.rawLabel,
        },
        transaction,
      })
    }
  }

  return product.id
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function enrichProducts(
  detected: DetectedProduct[],
  userId: string,
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

  // ── Collect OBF-only products (not already matched in DB) ──────────────
  const obfOnlyProducts: ObfProduct[] = []
  const allObfProducts = obfResults.flat()
  for (const obf of allObfProducts) {
    if (!obf.product_name) continue
    const key = normalize(obf.product_name)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    obfOnlyProducts.push(obf)
  }

  // ── Persist OBF products + create Scan records in a transaction ────────
  await sequelize.transaction(async (transaction) => {
    const { Scan } = getModels()

    // Persist OBF products and build enriched entries
    for (const obf of obfOnlyProducts) {
      const productId = await persistObfProduct(obf, transaction)
      enriched.push({
        source: "obf",
        productId,
        brand: obf.brands ?? null,
        name: obf.product_name ?? "Unknown",
        imageUrl: obf.image_url ?? null,
        confidence: 0.5,
        matchType: null,
        obfData: obfToInfo(obf),
      })
    }

    // Create Scan records for ALL enriched products
    for (const ep of enriched) {
      if (!ep.productId) continue
      await Scan.create(
        {
          userId,
          productId: ep.productId,
          scanType: "url",
          resultStatus: "success",
        },
        { transaction },
      )
    }
  })

  return enriched
}
