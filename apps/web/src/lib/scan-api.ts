const API_BASE = '/api/scan'

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvaluationReason {
  text: string
  positive: boolean
}

export interface RoutineImpact {
  timeOfDay: 'morning' | 'evening' | 'both'
  description: string
}

export interface ProductInfo {
  name: string
  brandName: string | null
  description: string | null
  imageUrl: string | null
  category: string
  tags: string[]
}

export interface EvaluationResult {
  scanId: string
  productId: string
  product: ProductInfo
  decision: 'BUY' | 'DONT_BUY' | 'CAUTION'
  summary: string
  reasons: EvaluationReason[]
  routineImpact: RoutineImpact
  conflictingProducts: string[]
}

export interface ProductListItem {
  id: string
  name: string
  brandName: string | null
  category: string
  imageUrl: string | null
}

export interface LookupProduct {
  id: string
  barcode: string
  name: string | null
  brand: string | null
  imageUrl: string | null
  source: 'internal' | 'open_beauty_facts' | 'not_found'
  ingredientsText: string | null
  ingredients: string[]
}

export interface LookupResult {
  product: LookupProduct
  capture: {
    method: 'barcode'
    confidence: number | null
  }
  isNew: boolean
  needsIngredients: boolean
}

export interface OcrIngredientsResult {
  ocrText: string
  confidence: number
  ingredients: Array<{
    inciName: string
    rawLabel: string
    order: number
  }>
}

export interface SaveIngredientsResult {
  success: boolean
  ingredientCount: number
  ingredients: string[]
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function resolveBarcode(
  userId: string,
  barcode: string,
  barcodeFormat?: string,
): Promise<LookupResult> {
  const res = await fetch(`${API_BASE}/resolve`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ barcode, barcodeFormat }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'Barcode lookup failed',
    )
  }

  return json.data
}

export async function evaluateProduct(
  userId: string,
  productId: string,
): Promise<EvaluationResult> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ productId }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'Evaluation failed',
    )
  }

  return json.data
}

export async function listProducts(userId: string): Promise<ProductListItem[]> {
  const res = await fetch(`${API_BASE}/products`, {
    headers: headers(userId),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to list products')
  }

  return json.data
}

// ─── Scan history ────────────────────────────────────────────────────────────

export interface ScanHistoryProduct {
  id: string
  name: string
  brandName: string | null
  category: string
  imageUrl: string | null
}

export interface ScanHistoryItem {
  id: string
  barcodeValue: string | null
  scanType: string
  resultStatus: string
  createdAt: string
  product: ScanHistoryProduct | null
}

export interface ScanHistoryResponse {
  scans: ScanHistoryItem[]
  total: number
  limit: number
  offset: number
}

export async function fetchScanHistory(
  userId: string,
  limit = 10,
  offset = 0,
): Promise<ScanHistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${API_BASE}/history?${params}`, {
    headers: headers(userId),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to fetch scan history')
  }

  return json.data
}

// ─── Ingredient capture API functions ────────────────────────────────────────

export async function ocrIngredients(
  userId: string,
  imageFile: File,
): Promise<OcrIngredientsResult> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const res = await fetch(`${API_BASE}/ocr-ingredients`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: formData,
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'OCR extraction failed')
  }

  return json.data
}

export async function saveIngredients(
  userId: string,
  productId: string,
  ingredientsText: string,
): Promise<SaveIngredientsResult> {
  const res = await fetch(`${API_BASE}/save-ingredients`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ productId, ingredientsText }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to save ingredients')
  }

  return json.data
}

// ─── Image recognition types ─────────────────────────────────────────────────

export interface ImageRecognitionCandidate {
  id: string
  name: string
  brandName: string | null
  category: string
  imageUrl: string | null
  score: number
}

export interface ImageRecognitionExtracted {
  barcode: string | null
  text: string
  brand: string | null
  name: string | null
  attributes: string[]
}

export interface ImageRecognitionResult {
  matchType: 'exact' | 'candidates' | 'none'
  confidence: number
  matchedProduct: ImageRecognitionCandidate | null
  candidates: ImageRecognitionCandidate[]
  extracted: ImageRecognitionExtracted
}

// ─── Image recognition API ───────────────────────────────────────────────────

export async function recognizeImage(
  userId: string,
  imageFile: File,
): Promise<ImageRecognitionResult> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const res = await fetch(`${API_BASE}/recognize-image`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: formData,
  })

  const json = await res.json()

  if (!json.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'Image recognition failed',
    )
  }

  return json.data
}

// ─── Create product API ──────────────────────────────────────────────────────

export interface CreateProductResult {
  id: string
  name: string
  brandName: string | null
  category: string
}

export async function createProduct(
  userId: string,
  data: { name: string; brand?: string; attributes?: string[] },
): Promise<CreateProductResult> {
  const res = await fetch(`${API_BASE}/create-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'Failed to create product',
    )
  }

  return json.data
}
