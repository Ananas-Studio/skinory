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
