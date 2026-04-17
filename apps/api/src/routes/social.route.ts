// ─── Social Link Analysis Routes ─────────────────────────────────────────────

import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { checkUsage, recordUsageFromReq } from "../middlewares/usage.middleware.js"
import { parseSocialLink, isEcommercePlatform } from "../services/social/social-link-parser.js"
import { readSocialContent } from "../services/social/social-content-reader.js"
import { readEcommerceProduct } from "../services/social/ecommerce-content-reader.js"
import { persistEcommerceProduct } from "../services/social/ecommerce-product-persister.js"
import { detectProducts as llmDetect } from "../services/social/social-product-detector.js"
import { enrichProducts } from "../services/social/social-product-enricher.js"

const socialRouter = Router()

// ─── Validation schemas ──────────────────────────────────────────────────────

const scrapeBodySchema = z.object({
  url: z.string().trim().min(1).url(),
})

const detectBodySchema = z.object({
  text: z.string().trim().min(1).max(10000),
})

const enrichBodySchema = z.object({
  products: z.array(z.object({
    brand: z.string().nullable(),
    name: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })).min(1).max(10),
})

// ─── POST /social/scrape ─────────────────────────────────────────────────────
// Step 1: Parse URL + read social content (oEmbed / OG tags)

socialRouter.post("/scrape", requireAuth, checkUsage("social_scrape"), async (req, res) => {
  try {
    const parseResult = scrapeBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "SOCIAL_INVALID_URL",
          message: "Please provide a valid URL",
          details: parseResult.error.flatten(),
        },
      })
      return
    }

    const { url } = parseResult.data
    const parsed = parseSocialLink(url)

    // ── E-commerce shortcut: scrape product page → persist → return ───
    if (isEcommercePlatform(parsed.platform)) {
      const ecomProduct = await readEcommerceProduct(parsed.platform, parsed.normalizedUrl)

      if (!ecomProduct.name) {
        res.status(200).json({
          ok: true,
          data: {
            platform: parsed.platform,
            resourceType: parsed.resourceType,
            isEcommerce: true,
            preview: { text: null, author: null, thumbnail: null },
            ecommerceProduct: null,
          },
        })
        return
      }

      const userId = (req as any).authUserId as string
      const persisted = await persistEcommerceProduct(ecomProduct, userId)

      res.status(200).json({
        ok: true,
        data: {
          platform: parsed.platform,
          resourceType: parsed.resourceType,
          isEcommerce: true,
          preview: {
            text: ecomProduct.description,
            author: ecomProduct.brand,
            thumbnail: ecomProduct.imageUrl,
          },
          ecommerceProduct: persisted
            ? {
                productId: persisted.productId,
                name: persisted.name,
                brand: persisted.brand,
                imageUrl: persisted.imageUrl,
                category: persisted.category,
                isNew: persisted.isNew,
                needsIngredients: persisted.needsIngredients,
              }
            : null,
        },
      })
      return
    }

    // ── Social media flow ─────────────────────────────────────────────
    const content = await readSocialContent(parsed.platform, parsed.normalizedUrl)

    res.status(200).json({
      ok: true,
      data: {
        platform: parsed.platform,
        resourceType: parsed.resourceType,
        isEcommerce: false,
        preview: {
          text: content.text || null,
          author: content.author,
          thumbnail: content.thumbnail,
        },
      },
    })
  } catch (error) {
    console.error("[social/scrape] Unexpected error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "SOCIAL_SCRAPE_FAILED", message: "Failed to read the link" },
    })
  }
})

// ─── POST /social/detect ─────────────────────────────────────────────────────
// Step 2: Send text to LLM → extract product mentions

socialRouter.post("/detect", requireAuth, checkUsage("ai_social_detect"), async (req, res) => {
  try {
    const parseResult = detectBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "SOCIAL_INVALID_TEXT",
          message: "Please provide the post text to analyze",
          details: parseResult.error.flatten(),
        },
      })
      return
    }

    const detected = await llmDetect(parseResult.data.text)

    await recordUsageFromReq(req)
    res.status(200).json({ ok: true, data: { detectedProducts: detected } })
  } catch (error) {
    console.error("[social/detect] Unexpected error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "SOCIAL_DETECT_FAILED", message: "Failed to detect products from text" },
    })
  }
})

// ─── POST /social/enrich ─────────────────────────────────────────────────────
// Step 3: Match detected products against internal DB + Open Beauty Facts

socialRouter.post("/enrich", requireAuth, checkUsage("social_enrich"), async (req, res) => {
  try {
    const parseResult = enrichBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "SOCIAL_INVALID_PRODUCTS",
          message: "Please provide detected products to enrich",
          details: parseResult.error.flatten(),
        },
      })
      return
    }

    const userId = (req as any).authUserId as string
    const enriched = await enrichProducts(parseResult.data.products, userId)

    res.status(200).json({ ok: true, data: { products: enriched } })
  } catch (error) {
    console.error("[social/enrich] Unexpected error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "SOCIAL_ENRICH_FAILED", message: "Failed to enrich product data" },
    })
  }
})

export { socialRouter }
