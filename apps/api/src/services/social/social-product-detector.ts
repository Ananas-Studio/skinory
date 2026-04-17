// ─── Social Product Detector ─────────────────────────────────────────────────
// Uses OpenAI to extract product mentions from social media text content.

import OpenAI from "openai"
import { env } from "../../config/env.js"

export interface DetectedProduct {
  brand: string | null
  name: string | null
  confidence: number
}

// ─── LLM prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a skincare & beauty product extraction engine.
Given text from a social media post, extract every skincare, makeup, haircare,
or beauty product mentioned.

Rules:
- Return ONLY valid JSON matching the schema below.
- Each product should have brand (if identifiable), name, and a confidence score 0-1.
- confidence reflects how certain you are this is a real product mention (not a generic term).
- If the text mentions a brand without a specific product name, set name to null.
- If no products are found, return an empty products array.
- Do NOT hallucinate products not mentioned in the text.
- Do NOT include any text outside the JSON object.

JSON schema:
{
  "products": [
    { "brand": "string | null", "name": "string | null", "confidence": 0.0 }
  ]
}`

// ─── Public API ──────────────────────────────────────────────────────────────

export async function detectProducts(text: string): Promise<DetectedProduct[]> {
  if (!text.trim()) return []

  if (!env.openaiApiKey) {
    console.warn("[social-product-detector] OPENAI_API_KEY not configured, skipping detection")
    return []
  }

  const openai = new OpenAI({ apiKey: env.openaiApiKey })

  try {
    const completion = await openai.chat.completions.create(
      {
        model: env.openaiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1024,
      },
      { signal: AbortSignal.timeout(30_000) },
    )

    const raw = completion.choices[0]?.message?.content?.trim()
    if (!raw) return []

    const parsed = JSON.parse(raw) as { products?: unknown[] }
    if (!Array.isArray(parsed.products)) return []

    return parsed.products
      .filter(
        (p): p is { brand?: string; name?: string; confidence?: number } =>
          typeof p === "object" && p !== null
      )
      .map((p) => ({
        brand: typeof p.brand === "string" ? p.brand : null,
        name: typeof p.name === "string" ? p.name : null,
        confidence: typeof p.confidence === "number" ? Math.min(1, Math.max(0, p.confidence)) : 0.5,
      }))
      .filter((p) => p.brand || p.name)
  } catch (err) {
    console.error("[social-product-detector] OpenAI call failed:", err)
    return []
  }
}
