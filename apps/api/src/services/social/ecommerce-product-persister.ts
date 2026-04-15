// ─── E-Commerce Product Persister ────────────────────────────────────────────
// Persists an e-commerce product into the database: Brand → Product →
// Ingredients → Scan record. Similar pattern to social-product-enricher's
// OBF persistence but tailored for e-commerce scraped data.

import { sequelize } from "../../config/database.js"
import { getModels } from "../../models/index.js"
import { slugify } from "../product-lookup.service.js"
import { parseIngredientString } from "@skinory/core"
import type { EcommerceProduct } from "./ecommerce-content-reader.js"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PersistedEcommerceProduct {
  productId: string
  name: string
  brand: string | null
  imageUrl: string | null
  category: string
  isNew: boolean
  needsIngredients: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferCategory(text: string | null): "skincare" | "makeup" | "supplement" | "other" {
  if (!text) return "other"
  const lower = text.toLowerCase()
  if (lower.includes("skincare") || lower.includes("cilt") || lower.includes("moistur") || lower.includes("cleanser") || lower.includes("serum") || lower.includes("nemlendirici") || lower.includes("temizleyici")) return "skincare"
  if (lower.includes("makeup") || lower.includes("makyaj") || lower.includes("foundation") || lower.includes("lipstick") || lower.includes("ruj") || lower.includes("far")) return "makeup"
  if (lower.includes("supplement") || lower.includes("vitamin") || lower.includes("takviye")) return "supplement"
  return "other"
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function persistEcommerceProduct(
  ecomProduct: EcommerceProduct,
  userId: string,
): Promise<PersistedEcommerceProduct | null> {
  const productName = ecomProduct.name?.trim()
  if (!productName) return null

  const result = await sequelize.transaction(async (transaction) => {
    const { Brand, Product, Ingredient, ProductIngredient, Scan } = getModels()

    // ── Brand ────────────────────────────────────────────────────────────
    let brandId: string | null = null
    const brandName = ecomProduct.brand?.trim() || null
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

    // ── Product ──────────────────────────────────────────────────────────
    const productSlug = slugify(productName) || `ecom-${Date.now()}`
    const category = inferCategory(
      ecomProduct.category ?? ecomProduct.description ?? ecomProduct.name,
    )

    const [product, created] = await Product.findOrCreate({
      where: { slug: productSlug },
      defaults: {
        name: productName,
        brandId,
        slug: productSlug,
        category,
        imageUrl: ecomProduct.imageUrl ?? null,
        sourceType: "url_scrape",
        sourceConfidence: "0.6000",
      },
      transaction,
    })

    // ── Ingredients ──────────────────────────────────────────────────────
    let hasIngredients = false
    if (ecomProduct.ingredientsText) {
      const parsed = parseIngredientString(ecomProduct.ingredientsText)
      if (parsed.ingredients.length > 0) {
        hasIngredients = true
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
    }

    // Check if product already has ingredients from a previous scan
    if (!hasIngredients) {
      const existingCount = await ProductIngredient.count({
        where: { productId: product.id },
        transaction,
      })
      if (existingCount > 0) hasIngredients = true
    }

    // ── Scan record ──────────────────────────────────────────────────────
    await Scan.create(
      {
        userId,
        productId: product.id,
        scanType: "url",
        resultStatus: "success",
      },
      { transaction },
    )

    return {
      productId: product.id,
      name: product.name,
      brand: brandName,
      imageUrl: product.imageUrl ?? ecomProduct.imageUrl ?? null,
      category,
      isNew: created,
      needsIngredients: !hasIngredients,
    }
  })

  return result
}
