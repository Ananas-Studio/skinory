import OpenAI from 'openai'
import { env } from '../../config/env.js'
import type { OcrOptions, OcrProvider, OcrResult } from './types.js'

// ─── Vision OCR Provider ────────────────────────────────────────────────────
//
// Uses GPT-4o-mini Vision to extract ingredient text from product images.
// Much more accurate than Tesseract on real-world product labels with
// varied fonts, backgrounds, angles, and languages.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a cosmetic/skincare product ingredient list reader.
Your job is to extract ONLY the ingredient list from the product image.

Rules:
- Return ONLY the raw ingredient text, nothing else.
- Ingredients are typically comma-separated, starting after "Ingredients:" or similar label.
- Preserve the original ingredient names exactly as printed (INCI names).
- Do not translate, reformat, or add any ingredients that are not visible.
- If you see multiple languages, prefer the English/INCI version.
- If no ingredient list is visible, return exactly: NO_INGREDIENTS_FOUND
- Do not add any explanation, markdown, or formatting — just the plain ingredient text.`

export class VisionOcrProvider implements OcrProvider {
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: env.openaiApiKey })
    }
    return this.client
  }

  async recognize(imageBuffer: Buffer, _options?: OcrOptions): Promise<OcrResult> {
    if (!env.openaiApiKey) {
      throw new Error('Vision OCR not configured (missing OPENAI_API_KEY)')
    }

    const start = performance.now()
    const openai = this.getClient()

    const base64Image = imageBuffer.toString('base64')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
            },
            { type: 'text', text: 'Extract the ingredient list from this product image.' },
          ],
        },
      ],
    })

    const text = response.choices[0]?.message?.content?.trim() ?? ''
    const elapsed = (performance.now() - start).toFixed(0)
    console.log(`[OCR] Vision processed ingredient image in ${elapsed}ms`)

    const isNoIngredients = text === 'NO_INGREDIENTS_FOUND' || text.length === 0

    return {
      text: isNoIngredients ? '' : text,
      confidence: isNoIngredients ? 0 : 0.95,
      language: 'eng',
    }
  }

  async destroy(): Promise<void> {
    this.client = null
  }
}
