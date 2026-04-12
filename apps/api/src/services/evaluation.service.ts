import OpenAI from 'openai'
import { env } from '../config/env.js'
import { getModels } from '../models/index.js'

// ─── Public types ────────────────────────────────────────────────────────────

export interface EvaluationReason {
  text: string
  positive: boolean
}

export interface RoutineImpact {
  timeOfDay: 'morning' | 'evening' | 'both'
  description: string
}

export interface EvaluationResult {
  scanId: string
  productId: string
  product: {
    name: string
    brandName: string | null
    description: string | null
    imageUrl: string | null
    category: string
    tags: string[]
  }
  decision: 'BUY' | 'DONT_BUY' | 'CAUTION'
  summary: string
  reasons: EvaluationReason[]
  routineImpact: RoutineImpact
  conflictingProducts: string[]
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class EvaluationServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'EvaluationServiceError'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildIngredientList(product: any): string {
  const ingredients = product.ingredients ?? product.Ingredients ?? []
  if (!ingredients.length) return 'No ingredient data available.'

  return ingredients
    .sort((a: any, b: any) => {
      const orderA = a.ProductIngredient?.ingredientOrder ?? a.productIngredient?.ingredientOrder ?? 999
      const orderB = b.ProductIngredient?.ingredientOrder ?? b.productIngredient?.ingredientOrder ?? 999
      return orderA - orderB
    })
    .map((ing: any) => {
      const name = ing.displayName || ing.inciName
      const extras: string[] = []
      if (ing.comedogenicRating && ing.comedogenicRating > 0) extras.push(`comedogenic: ${ing.comedogenicRating}/5`)
      if (ing.isPotentialAllergen) extras.push('potential allergen')
      if (ing.isActiveIngredient) extras.push('active')
      return extras.length ? `${name} (${extras.join(', ')})` : name
    })
    .join(', ')
}

function buildUserContext(skinProfile: any, concerns: any[], inventoryItems: any[], routines: any[]): string {
  const parts: string[] = []

  if (skinProfile) {
    parts.push(`Skin type: ${skinProfile.skinType ?? 'unknown'}`)
    parts.push(`Sensitivity: ${skinProfile.sensitivityLevel ?? 'unknown'}`)
    if (skinProfile.acneProne) parts.push('Acne-prone: yes')
    if (skinProfile.notes) parts.push(`Notes: ${skinProfile.notes}`)
  } else {
    parts.push('No skin profile available.')
  }

  if (concerns.length) {
    parts.push(`Skin concerns: ${concerns.map((c: any) => c.concern?.name ?? c.name ?? 'unknown').join(', ')}`)
  }

  if (inventoryItems.length) {
    const names = inventoryItems
      .filter((item: any) => item.product || item.Product)
      .map((item: any) => {
        const p = item.product ?? item.Product
        return p?.name ?? 'unknown product'
      })
    if (names.length) parts.push(`Products currently in inventory: ${names.join(', ')}`)
  }

  if (routines.length) {
    const desc = routines.map((r: any) => `${r.name} (${r.timeOfDay})`).join(', ')
    parts.push(`Active routines: ${desc}`)
  }

  return parts.join('\n')
}

function deriveProductTags(product: any, skinProfile: any): string[] {
  const tags: string[] = []
  if (skinProfile?.skinType) {
    const label = skinProfile.skinType.charAt(0).toUpperCase() + skinProfile.skinType.slice(1) + ' Skin'
    tags.push(label)
  }
  const desc = (product.description ?? '').toLowerCase()
  if (desc.includes('fragrance-free') || desc.includes('fragrance free')) tags.push('Fragrance-free')
  if (desc.includes('non-comedogenic')) tags.push('Non-comedogenic')
  if (desc.includes('hypoallergenic')) tags.push('Hypoallergenic')
  if (product.subcategory) tags.push(product.subcategory.charAt(0).toUpperCase() + product.subcategory.slice(1))
  return tags.slice(0, 3)
}

// ─── OpenAI prompt ───────────────────────────────────────────────────────────

const EVALUATION_SYSTEM_PROMPT = `You are Skinory's product evaluation engine. Given a product and a user's skin profile, evaluate whether the user should BUY, NOT BUY (DONT_BUY), or use with CAUTION.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "decision": "BUY" | "DONT_BUY" | "CAUTION",
  "summary": "Short one-sentence summary (e.g. 'Great choice for your routine!')",
  "reasons": [
    { "text": "Reason description", "positive": true/false }
  ],
  "routineImpact": {
    "timeOfDay": "morning" | "evening" | "both",
    "description": "Short description of when/how to use"
  },
  "conflictingProducts": ["product names from user inventory that conflict"]
}

Rules:
- Provide 3-5 reasons. Each reason is one sentence.
- "positive" is true for benefits, false for concerns/warnings.
- For BUY decisions, most reasons should be positive.
- For DONT_BUY, most should be negative.
- For CAUTION, mix of both.
- conflictingProducts should only list products from the user's inventory that would conflict.
- Be specific to the user's skin type and concerns.
- Consider ingredient safety, comedogenic ratings, and allergen flags.
- Do NOT include any text outside the JSON object.`

// ─── Main evaluation function ────────────────────────────────────────────────

export async function evaluateProduct(userId: string, productId: string): Promise<EvaluationResult> {
  const models = getModels()

  // Load product with brand + ingredients
  const product = await models.Product.findByPk(productId, {
    include: [
      { model: models.Brand, as: 'brand' },
      {
        model: models.Ingredient,
        as: 'ingredients',
        through: { attributes: ['ingredientOrder'] },
      },
    ],
  })

  if (!product) {
    throw new EvaluationServiceError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }

  // Load user context
  const skinProfile = await models.SkinProfile.findOne({ where: { userId } })

  const userConcerns = await models.UserSkinConcern.findAll({
    where: { userId },
    include: [{ model: models.SkinConcern, as: 'concern' }],
  })

  const inventory = await models.Inventory.findOne({ where: { userId, isActive: true } })
  let inventoryItems: any[] = []
  if (inventory) {
    inventoryItems = await models.InventoryItem.findAll({
      where: { inventoryId: inventory.id, status: 'active' },
      include: [{ model: models.Product, as: 'product' }],
    })
  }

  const routines = await models.Routine.findAll({
    where: { userId, isActive: true },
  })

  // Build prompt context
  const brandName = (product as any).brand?.name ?? null
  const ingredientList = buildIngredientList(product)
  const userContext = buildUserContext(skinProfile, userConcerns, inventoryItems, routines)

  const userMessage = `
Product: ${brandName ? `${brandName} ` : ''}${product.name}
Category: ${product.category}${product.subcategory ? ` / ${product.subcategory}` : ''}
Description: ${product.description ?? 'N/A'}
Ingredients: ${ingredientList}

User Profile:
${userContext}
`.trim()

  // Call OpenAI
  if (!env.openaiApiKey || env.openaiApiKey.startsWith('sk-your-')) {
    // Fallback for missing API key — return a demo result
    return buildDemoResult(product, brandName, skinProfile, productId)
  }

  const openai = new OpenAI({ apiKey: env.openaiApiKey })

  let parsed: any
  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      messages: [
        { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    parsed = JSON.parse(raw)
  } catch (err: any) {
    throw new EvaluationServiceError(
      'OPENAI_ERROR',
      `Evaluation failed: ${err.message}`,
      502,
    )
  }

  // Validate and normalize
  const decision = (['BUY', 'DONT_BUY', 'CAUTION'].includes(parsed.decision))
    ? parsed.decision
    : 'CAUTION'

  const reasons: EvaluationReason[] = Array.isArray(parsed.reasons)
    ? parsed.reasons.slice(0, 6).map((r: any) => ({
        text: String(r.text ?? ''),
        positive: Boolean(r.positive),
      }))
    : [{ text: 'Unable to determine detailed reasons.', positive: false }]

  const routineImpact: RoutineImpact = {
    timeOfDay: ['morning', 'evening', 'both'].includes(parsed.routineImpact?.timeOfDay)
      ? parsed.routineImpact.timeOfDay
      : 'both',
    description: String(parsed.routineImpact?.description ?? 'Can be used as part of your routine'),
  }

  const conflictingProducts: string[] = Array.isArray(parsed.conflictingProducts)
    ? parsed.conflictingProducts.map(String)
    : []

  // Persist scan record
  const primaryBarcode = await models.ProductBarcode.findOne({
    where: { productId, isPrimary: true },
  })
  const scan = await models.Scan.create({
    userId,
    barcodeValue: primaryBarcode?.barcode ?? null,
    scanType: 'barcode',
    resultStatus: 'success',
  })

  // Persist recommendation
  const recType = decision === 'BUY' ? 'buy' : decision === 'DONT_BUY' ? 'dont_buy' : 'caution'
  const session = await models.AdviceSession.create({
    userId,
    title: `Evaluation: ${product.name}`,
    status: 'completed',
    sourceTrigger: 'scan',
  })

  await models.Recommendation.create({
    adviceSessionId: session.id,
    productId: product.id,
    recommendationType: recType,
    shortReason: parsed.summary ?? reasons[0]?.text ?? '',
    rankOrder: 0,
  })

  const tags = deriveProductTags(product, skinProfile)

  return {
    scanId: scan.id,
    productId: product.id,
    product: {
      name: product.name,
      brandName,
      description: product.description,
      imageUrl: product.imageUrl,
      category: product.category,
      tags,
    },
    decision,
    summary: String(parsed.summary ?? 'Evaluation complete'),
    reasons,
    routineImpact,
    conflictingProducts,
  }
}

// ─── Demo fallback (no API key) ─────────────────────────────────────────────

function buildDemoResult(product: any, brandName: string | null, skinProfile: any, productId: string): EvaluationResult {
  const tags = deriveProductTags(product, skinProfile)

  return {
    scanId: 'demo-scan',
    productId,
    product: {
      name: product.name,
      brandName,
      description: product.description,
      imageUrl: product.imageUrl,
      category: product.category,
      tags,
    },
    decision: 'BUY',
    summary: 'Great choice for your routine!',
    reasons: [
      { text: 'Perfect for your skin type: hydrating, non-irritating and fragrance-free.', positive: true },
      { text: 'Strengthens skin barrier with ceramides.', positive: true },
      { text: 'No conflicts with your routine.', positive: true },
      { text: 'Safe to use morning & night.', positive: true },
    ],
    routineImpact: { timeOfDay: 'evening', description: 'Best used at night' },
    conflictingProducts: [],
  }
}
