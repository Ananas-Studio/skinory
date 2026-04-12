const API_BASE = '/api/inventory'

interface ApiOk<T> {
  ok: true
  data: T
}

interface ApiErr {
  ok: false
  error: { code: string; message: string; details?: unknown }
}

type ApiResult<T> = ApiOk<T> | ApiErr

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string
  productId: string
  productName: string
  brandName: string | null
  imageUrl: string | null
  category: string
  status: string
  source: string
  createdAt: string
}

export interface AddToInventoryResult {
  id: string
  alreadyExisted: boolean
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function addToInventory(
  userId: string,
  productId: string,
  source: 'scan' | 'url' | 'manual' = 'scan',
): Promise<AddToInventoryResult> {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ productId, source }),
  })

  const json: ApiResult<AddToInventoryResult> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}

export async function listInventoryItems(
  userId: string,
): Promise<InventoryItem[]> {
  const res = await fetch(`${API_BASE}/items`, {
    headers: headers(userId),
  })

  const json: ApiResult<InventoryItem[]> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
  return json.data
}

export async function removeInventoryItem(
  userId: string,
  itemId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/items/${itemId}`, {
    method: 'DELETE',
    headers: headers(userId),
  })

  const json: ApiResult<null> = await res.json()
  if (!json.ok) throw new Error(json.error.message)
}
