// ─── Social Link Analysis Route ──────────────────────────────────────────────

import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { parseSocialLink } from "../services/social/social-link-parser.js"
import { readSocialContent } from "../services/social/social-content-reader.js"
import { detectProducts } from "../services/social/social-product-detector.js"
import { matchProducts } from "../services/social/social-product-matcher.js"

const socialRouter = Router()

// ─── Validation ──────────────────────────────────────────────────────────────

const analyzeBodySchema = z.object({
  url: z.string().trim().min(1).url(),
})

// ─── POST /social/analyze ────────────────────────────────────────────────────

socialRouter.post("/analyze", requireAuth, async (req, res) => {
  try {
    // 1. Validate input
    const parseResult = analyzeBodySchema.safeParse(req.body)
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

    // 2. Parse & normalize the social link
    const parsed = parseSocialLink(url)

    // 3. Read content from the social post
    const content = await readSocialContent(parsed.platform, parsed.normalizedUrl)

    // 4. Detect products via LLM (only if we have text)
    const detectedProducts = content.text
      ? await detectProducts(content.text)
      : []

    // 5. Match detected products against our database
    const matches = detectedProducts.length > 0
      ? await matchProducts(detectedProducts)
      : []

    // 6. Return assembled response
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
        detectedProducts,
        matches,
      },
    })
  } catch (error) {
    console.error("[social/analyze] Unexpected error:", error)
    res.status(500).json({
      ok: false,
      error: {
        code: "SOCIAL_ANALYSIS_FAILED",
        message: "Failed to analyze the social media link",
      },
    })
  }
})

export { socialRouter }
