const API_BASE = '/api/favorites'

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiOk<T> { ok: true; data: T }
interface ApiErr { ok: false; error: { code: string; message: string } }
type ApiResult<T> = ApiOk<T> | ApiErr

export interface FavoriteProduct {
  id: string
  name: string
  imageUrl: string | null
  category: string
  brandName: string | null
}

export interface FavoriteItem {
  id: string
  productId: string
  createdAt: string
  product: FavoriteProduct | null
}

export interface FavoritesListResponse {
  favorites: FavoriteItem[]
  total: number
  limit: number
  offset: number
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function addFavorite(userId: string, productId: string): Promise<{ id: string; added: boolean }> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ productId }),
  })
  const json: ApiResult<{ id: string; productId: string; added: boolean }> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}

export async function removeFavorite(userId: string, productId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${productId}`, {
    method: 'DELETE',
    headers: headers(userId),
  })
  const json: ApiResult<{ productId: string; removed: boolean }> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
}

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/ids`, {
    headers: headers(userId),
  })
  const json: ApiResult<{ productIds: string[] }> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data.productIds
}

export async function fetchFavorites(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<FavoritesListResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${API_BASE}?${params}`, {
    headers: headers(userId),
  })
  const json: ApiResult<FavoritesListResponse> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}
