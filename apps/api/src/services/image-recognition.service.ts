import OpenAI from 'openai'
import { Op } from 'sequelize'
import { env } from '../config/env.js'
import { getModels } from '../models/index.js'
import {
  resolveProduct,
  transliterate,
  inferCategoryFromText,
  type LookupResult,
} from './product-lookup.service.js'
import { searchObfByName } from './obf-client.js'

// ─── Public types ────────────────────────────────────────────────────────────

export type MatchType = 'exact' | 'candidates' | 'none'

export interface ExtractedFields {
  barcode: string | null
  text: string
  brand: string | null
  name: string | null
  attributes: string[]
}

export interface CandidateProduct {
  id: string
  name: string
  brandName: string | null
  category: string
  imageUrl: string | null
  score: number
}

export interface ImageRecognitionResult {
  matchType: MatchType
  confidence: number
  matchedProduct: CandidateProduct | null
  candidates: CandidateProduct[]
  extracted: ExtractedFields
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ImageRecognitionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ImageRecognitionError'
  }
}

// ─── Confidence thresholds ───────────────────────────────────────────────────

const HIGH_CONFIDENCE_THRESHOLD = 0.75
const MEDIUM_CONFIDENCE_THRESHOLD = 0.40
const MAX_CANDIDATES = 5

// ─── OpenAI Vision — extract product info from image ─────────────────────────

const VISION_SYSTEM_PROMPT = `You are a product recognition assistant for skincare/cosmetic products.
Analyze the product photo and extract structured information.
Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "barcode": null or string (if a barcode number is visible),
  "brand": null or string (the brand/manufacturer name),
  "name": null or string (the product name),
  "type": null or string (e.g. "moisturizer", "serum", "cleanser", "sunscreen"),
  "attributes": string[] (size like "50ml", SPF value, notable claims like "hyaluronic acid"),
  "allText": string (all readable text on the product, separated by newlines)
}
If you cannot identify any product, return: {"barcode":null,"brand":null,"name":null,"type":null,"attributes":[],"allText":""}`

interface VisionExtractionResult {
  barcode: string | null
  brand: string | null
  name: string | null
  type: string | null
  attributes: string[]
  allText: string
}

async function extractFieldsWithVision(imageBuffer: Buffer): Promise<ExtractedFields> {
  const openai = new OpenAI({ apiKey: env.openaiApiKey })

  const base64Image = imageBuffer.toString('base64')
  const mimeType = 'image/jpeg'

  const response = await openai.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' },
            },
            { type: 'text', text: 'Identify this product.' },
          ],
        },
      ],
    },
    { signal: AbortSignal.timeout(30_000) },
  )

  const raw = response.choices[0]?.message?.content?.trim() ?? ''

  let parsed: VisionExtractionResult
  try {
    // Strip potential markdown code fences
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    parsed = JSON.parse(jsonStr) as VisionExtractionResult
  } catch {
    console.warn('[image-recognition] Failed to parse Vision response, using raw text:', raw)
    parsed = { barcode: null, brand: null, name: null, type: null, attributes: [], allText: raw }
  }

  const attributes = [...(parsed.attributes ?? [])]
  if (parsed.type) attributes.unshift(parsed.type)

  return {
    barcode: parsed.barcode ?? null,
    text: parsed.allText ?? '',
    brand: parsed.brand ?? null,
    name: parsed.name ?? null,
    attributes,
  }
}

// ─── Deterministic text similarity scoring (pure) ────────────────────────────

export function normalize(input: string): string {
  return transliterate(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function bigramSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return 0

  const bigramsA = new Map<string, number>()
  for (let i = 0; i < na.length - 1; i++) {
    const bg = na.slice(i, i + 2)
    bigramsA.set(bg, (bigramsA.get(bg) ?? 0) + 1)
  }

  const bigramsB = new Map<string, number>()
  for (let i = 0; i < nb.length - 1; i++) {
    const bg = nb.slice(i, i + 2)
    bigramsB.set(bg, (bigramsB.get(bg) ?? 0) + 1)
  }

  let intersection = 0
  for (const [bg, countA] of bigramsA) {
    const countB = bigramsB.get(bg) ?? 0
    intersection += Math.min(countA, countB)
  }

  const totalA = na.length - 1
  const totalB = nb.length - 1
  return (2 * intersection) / (totalA + totalB)
}

export function scoreCandidate(
  extracted: { brand: string | null; name: string | null; attributes: string[] },
  candidate: { name: string; brandName: string | null },
): number {
  let score = 0
  let weights = 0

  if (extracted.brand && candidate.brandName) {
    const brandSim = bigramSimilarity(extracted.brand, candidate.brandName)
    score += brandSim * 0.4
    weights += 0.4
  }

  if (extracted.name && candidate.name) {
    const nameSim = bigramSimilarity(extracted.name, candidate.name)
    score += nameSim * 0.5
    weights += 0.5
  }

  const fullText = normalize(
    [extracted.brand, extracted.name, ...extracted.attributes].filter(Boolean).join(' '),
  )
  const candidateFull = normalize([candidate.brandName, candidate.name].filter(Boolean).join(' '))
  if (candidateFull && fullText.includes(candidateFull)) {
    score += 0.1
    weights += 0.1
  } else if (candidateFull) {
    const containsSim = bigramSimilarity(fullText, candidateFull)
    score += containsSim * 0.1
    weights += 0.1
  }

  return weights > 0 ? score / weights : 0
}

// ─── DB candidate search ─────────────────────────────────────────────────────

async function searchCandidates(
  extracted: ExtractedFields,
): Promise<CandidateProduct[]> {
  const { Product, Brand } = getModels()

  const searchTokens: string[] = []
  if (extracted.brand) searchTokens.push(normalize(extracted.brand))
  if (extracted.name) searchTokens.push(normalize(extracted.name))

  if (searchTokens.length === 0) return []

  const whereConditions = searchTokens.map((token) => ({
    name: { [Op.iLike]: `%${token}%` },
  }))

  const products = await Product.findAll({
    where: {
      isActive: true,
      [Op.or]: whereConditions,
    },
    include: [{ model: Brand, as: 'brand' }],
    limit: 50,
  })

  let brandProducts: any[] = []
  if (extracted.brand) {
    const normalizedBrand = normalize(extracted.brand)
    const brands = await Brand.findAll({
      where: {
        name: { [Op.iLike]: `%${normalizedBrand}%` },
      },
    })
    if (brands.length > 0) {
      const brandIds = brands.map((b: any) => b.id)
      brandProducts = await Product.findAll({
        where: {
          isActive: true,
          brandId: { [Op.in]: brandIds },
        },
        include: [{ model: Brand, as: 'brand' }],
        limit: 50,
      })
    }
  }

  const allProducts = new Map<string, any>()
  for (const p of [...products, ...brandProducts]) {
    const prod = p as any
    allProducts.set(prod.id, prod)
  }

  const scored: CandidateProduct[] = []
  for (const prod of allProducts.values()) {
    const candidate = {
      id: prod.id,
      name: prod.name,
      brandName: prod.brand?.name ?? null,
      category: prod.category,
      imageUrl: prod.imageUrl ?? null,
      score: 0,
    }
    candidate.score = scoreCandidate(extracted, candidate)
    scored.push(candidate)
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  return scored.slice(0, MAX_CANDIDATES)
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function recognizeProductFromImage(
  imageBuffer: Buffer,
  userId: string,
): Promise<ImageRecognitionResult> {
  const startTime = performance.now()
  const { Scan } = getModels()

  if (!env.openaiApiKey) {
    throw new ImageRecognitionError(
      'VISION_NOT_CONFIGURED',
      'Image recognition is not available (missing API key)',
      503,
    )
  }

  // Step A: Extract product info from image using OpenAI Vision
  const extracted = await extractFieldsWithVision(imageBuffer)

  console.log('[image-recognition] Vision extracted:', {
    brand: extracted.brand,
    name: extracted.name,
    barcode: extracted.barcode,
    attributes: extracted.attributes,
  })

  // Step B: If barcode found, try barcode-first resolution
  if (extracted.barcode) {
    try {
      const lookupResult: LookupResult = await resolveProduct(extracted.barcode, userId)

      if (lookupResult.product.source !== 'not_found') {
        const matchedProduct: CandidateProduct = {
          id: lookupResult.product.id,
          name: lookupResult.product.name ?? 'Unknown Product',
          brandName: lookupResult.product.brand ?? null,
          category: inferCategoryFromText(
            lookupResult.product.name,
            lookupResult.product.brand,
          ),
          imageUrl: lookupResult.product.imageUrl ?? null,
          score: 1.0,
        }

        const elapsed = Math.round(performance.now() - startTime)
        console.log(`[image-recognition] Barcode match in ${elapsed}ms`)

        return {
          matchType: 'exact',
          confidence: 1.0,
          matchedProduct,
          candidates: [],
          extracted,
        }
      }
    } catch {
      console.log('[image-recognition] Barcode resolve failed, falling back to text matching')
    }
  }

  // Step C: Text-based product matching — internal DB first
  let candidates = await searchCandidates(extracted)

  // Step D: If internal DB has no good match, search Open Beauty Facts by name
  if (candidates.length === 0 || candidates[0].score < MEDIUM_CONFIDENCE_THRESHOLD) {
    const searchQuery = [extracted.brand, extracted.name].filter(Boolean).join(' ')
    if (searchQuery) {
      try {
        console.log(`[image-recognition] Internal DB miss, searching OBF: "${searchQuery}"`)
        const obfResults = await searchObfByName(searchQuery, 5)

        const obfCandidates: CandidateProduct[] = obfResults.map((p) => {
          const name = p.product_name ?? 'Unknown Product'
          const brandName = p.brands?.split(',')[0]?.trim() ?? null
          const candidate = {
            id: `obf:${normalize(brandName ?? '')}:${normalize(name)}`,
            name,
            brandName,
            category: inferCategoryFromText(name, brandName),
            imageUrl: p.image_url ?? null,
            score: 0,
          }
          candidate.score = scoreCandidate(extracted, candidate)
          return candidate
        })

        // Merge OBF candidates with internal, re-sort
        const merged = new Map<string, CandidateProduct>()
        for (const c of [...candidates, ...obfCandidates]) {
          const key = normalize([c.brandName, c.name].filter(Boolean).join(' '))
          const existing = merged.get(key)
          if (!existing || c.score > existing.score) {
            merged.set(key, c)
          }
        }
        candidates = [...merged.values()]
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .slice(0, MAX_CANDIDATES)

        console.log(`[image-recognition] OBF returned ${obfResults.length} results, merged ${candidates.length} candidates`)
      } catch {
        console.warn('[image-recognition] OBF search failed, continuing with internal results')
      }
    }
  }

  const topScore = candidates.length > 0 ? candidates[0].score : 0
  const matchType: MatchType =
    topScore >= HIGH_CONFIDENCE_THRESHOLD ? 'exact' :
    topScore >= MEDIUM_CONFIDENCE_THRESHOLD ? 'candidates' :
    'none'

  const resultStatus =
    matchType === 'exact' ? 'success' :
    matchType === 'candidates' ? 'partial' :
    'not_found'

  await Scan.create({
    userId,
    productId: matchType === 'exact' && !candidates[0].id.startsWith('obf:') ? candidates[0].id : null,
    scanType: 'image',
    resultStatus,
    scanDurationMs: Math.round(performance.now() - startTime),
  })

  const elapsed = Math.round(performance.now() - startTime)
  console.log(`[image-recognition] Vision match (${matchType}) in ${elapsed}ms`)

  if (matchType === 'exact') {
    return {
      matchType: 'exact',
      confidence: topScore,
      matchedProduct: candidates[0],
      candidates: [],
      extracted,
    }
  }

  if (matchType === 'candidates') {
    return {
      matchType: 'candidates',
      confidence: topScore,
      matchedProduct: null,
      candidates,
      extracted,
    }
  }

  return {
    matchType: 'none',
    confidence: 0,
    matchedProduct: null,
    candidates: [],
    extracted,
  }
}
