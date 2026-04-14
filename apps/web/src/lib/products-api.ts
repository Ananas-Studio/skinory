const API_BASE = '/api/products'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductListItem {
  id: string
  name: string
  brandName: string | null
  category: string
  imageUrl: string | null
}

export interface ProductsPage {
  items: ProductListItem[]
  total: number
  limit: number
  offset: number
}

interface ApiOk<T> {
  ok: true
  data: T
}

interface ApiErr {
  ok: false
  error: { code: string; message: string; details?: unknown }
}

type ApiResult<T> = ApiOk<T> | ApiErr

export interface ProductIngredientDetail {
  id: string
  inciName: string | null
  displayName: string | null
  description: string | null
  comedogenicRating: number | null
  isPotentialAllergen: boolean
  isActiveIngredient: boolean
  order: number | null
  rawLabel: string | null
  concentrationText: string | null
}

export interface ProductBarcodeDetail {
  barcode: string
  format: string | null
  isPrimary: boolean
}

export interface ProductSourceDetail {
  id: string
  sourceKind: string
  sourceUrl: string | null
  scrapeStatus: string
  createdAt: string
}

export interface ProductDetail {
  id: string
  name: string
  slug: string
  category: string | null
  subcategory: string | null
  productForm: string | null
  description: string | null
  imageUrl: string | null
  sourceType: string | null
  sourceConfidence: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  brand: { id: string; name: string; logoUrl: string | null } | null
  barcodes: ProductBarcodeDetail[]
  ingredients: ProductIngredientDetail[]
  sources: ProductSourceDetail[]
  obfExtras: Record<string, unknown>
}

export interface ProductUpdateData {
  description?: string
  subcategory?: string
  productForm?: string
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function fetchProducts(opts: {
  category?: string
  limit?: number
  offset?: number
  search?: string
}): Promise<ProductsPage> {
  const params = new URLSearchParams()
  if (opts.category) params.set('category', opts.category)
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  if (opts.search) params.set('search', opts.search)

  const url = params.size ? `${API_BASE}?${params}` : API_BASE
  const res = await fetch(url)

  const json: ApiResult<ProductsPage> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}

export async function fetchProductDetail(productId: string): Promise<ProductDetail> {
  const res = await fetch(`${API_BASE}/${productId}`)
  const json: ApiResult<ProductDetail> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}

export async function updateProductDetail(
  userId: string,
  productId: string,
  data: ProductUpdateData
): Promise<{ id: string; description: string | null; subcategory: string | null; productForm: string | null }> {
  const res = await fetch(`${API_BASE}/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(data),
  })
  const json: ApiResult<{ id: string; description: string | null; subcategory: string | null; productForm: string | null }> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}
