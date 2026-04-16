// ─── E-Commerce Product Persister ────────────────────────────────────────────
// Persists an e-commerce product into the database: Brand → Product →
// Ingredients → Scan record. Similar pattern to social-product-enricher's
// OBF persistence but tailored for e-commerce scraped data.

import { sequelize } from "../../config/database.js"
import { getModels } from "../../models/index.js"
import { slugify, inferCategoryFromText } from "../product-lookup.service.js"
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

// ─── Public API ──────────────────────────────────────────────────────────────

export async function persistEcommerceProduct(
  ecomProduct: EcommerceProduct,
  userId: string,
): Promise<PersistedEcommerceProduct | null> {
  const productName = ecomProduct.name?.trim()
  if (!productName) return null

  const result = await sequelize.transaction(async (transaction) => {
    const { Brand, Product, Ingredient, ProductIngredient, Scan, ProductSource } = getModels()

    // ── URL-based dedup: same URL → same product ─────────────────────────
    const sourceUrl = ecomProduct.url?.trim() || null
    if (sourceUrl) {
      const existingSource = await ProductSource.findOne({
        where: { sourceUrl, sourceKind: "url_scrape" },
        transaction,
      })
      if (existingSource) {
        const existing = await Product.findByPk(existingSource.productId, {
          include: [{ model: Brand, as: "brand" }],
          transaction,
        })
        if (existing) {
          // Record a new scan but reuse the existing product
          await Scan.create(
            { userId, productId: existing.id, scanType: "url", resultStatus: "success" },
            { transaction },
          )
          const brand = (existing as unknown as { brand?: { name: string } }).brand
          const existingIngCount = await ProductIngredient.count({
            where: { productId: existing.id },
            transaction,
          })

          // If we now have ingredients that were previously missing, persist them
          if (existingIngCount === 0 && ecomProduct.ingredientsText) {
            const parsed = parseIngredientString(ecomProduct.ingredientsText)
            for (const item of parsed.ingredients) {
              const [ingredient] = await Ingredient.findOrCreate({
                where: { inciName: item.inciName },
                defaults: { inciName: item.inciName, displayName: item.rawLabel },
                transaction,
              })
              await ProductIngredient.findOrCreate({
                where: { productId: existing.id, ingredientId: ingredient.id },
                defaults: {
                  productId: existing.id,
                  ingredientId: ingredient.id,
                  ingredientOrder: item.order,
                  rawLabel: item.rawLabel,
                },
                transaction,
              })
            }
          }

          return {
            productId: existing.id,
            name: existing.name,
            brand: brand?.name ?? null,
            imageUrl: existing.imageUrl ?? ecomProduct.imageUrl ?? null,
            category: existing.category as "skincare" | "makeup" | "supplement" | "other",
            isNew: false,
            needsIngredients: existingIngCount === 0 && !ecomProduct.ingredientsText,
          }
        }
      }
    }

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
    const category = inferCategoryFromText(
      ecomProduct.category, ecomProduct.description, ecomProduct.name, ecomProduct.brand,
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

    // ── ProductSource record for URL dedup ───────────────────────────────
    if (sourceUrl) {
      await ProductSource.findOrCreate({
        where: { sourceUrl, sourceKind: "url_scrape" },
        defaults: {
          productId: product.id,
          sourceKind: "url_scrape",
          sourceUrl,
          scrapeStatus: "success",
        },
        transaction,
      })
    }

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
