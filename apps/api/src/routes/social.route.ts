// ─── Social Link Analysis Routes ─────────────────────────────────────────────

import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { parseSocialLink } from "../services/social/social-link-parser.js"
import { readSocialContent } from "../services/social/social-content-reader.js"
import { detectProducts as llmDetect } from "../services/social/social-product-detector.js"
import { enrichProducts } from "../services/social/social-product-enricher.js"

const socialRouter = Router()

// ─── Validation schemas ──────────────────────────────────────────────────────

const scrapeBodySchema = z.object({
  url: z.string().trim().min(1).url(),
})

const detectBodySchema = z.object({
  text: z.string().trim().min(1),
})

const enrichBodySchema = z.object({
  products: z.array(z.object({
    brand: z.string().nullable(),
    name: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })).min(1),
})

// ─── POST /social/scrape ─────────────────────────────────────────────────────
// Step 1: Parse URL + read social content (oEmbed / OG tags)

socialRouter.post("/scrape", requireAuth, async (req, res) => {
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
    const content = await readSocialContent(parsed.platform, parsed.normalizedUrl)

    res.status(200).json({
      ok: true,
      data: {
        platform: parsed.platform,
        resourceType: parsed.resourceType,
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
      error: { code: "SOCIAL_SCRAPE_FAILED", message: "Failed to read the social media post" },
    })
  }
})

// ─── POST /social/detect ─────────────────────────────────────────────────────
// Step 2: Send text to LLM → extract product mentions

socialRouter.post("/detect", requireAuth, async (req, res) => {
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

socialRouter.post("/enrich", requireAuth, async (req, res) => {
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

    const enriched = await enrichProducts(parseResult.data.products)

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
