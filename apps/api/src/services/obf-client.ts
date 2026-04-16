// ─── Open Beauty Facts SDK Client (singleton) ───────────────────────────────
//
// Wraps the official @openfoodfacts/openfoodfacts-nodejs SDK configured for
// the Open Beauty Facts backend (BackendType.OBF → world.openbeautyfacts.org).
// ─────────────────────────────────────────────────────────────────────────────

import { OpenFoodFacts } from "@openfoodfacts/openfoodfacts-nodejs"

let client: OpenFoodFacts | null = null

function getClient(): OpenFoodFacts {
  if (!client) {
    // "OBF" maps to BackendType.OBF → world.openbeautyfacts.org
    client = new OpenFoodFacts(globalThis.fetch, { type: "OBF" as any })
  }
  return client
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface ObfProduct {
  product_name?: string
  generic_name?: string
  abbreviated_product_name?: string
  brands?: string
  image_url?: string
  ingredients_text?: string
  categories?: string
  categories_tags?: string[]
}

export interface ObfProductResult {
  found: boolean
  product: ObfProduct | undefined
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a product from Open Beauty Facts by barcode.
 * Returns `{ found: true, product }` when the barcode exists,
 * or `{ found: false, product: undefined }` otherwise.
 */
export async function fetchObfProduct(barcode: string): Promise<ObfProductResult> {
  try {
    const off = getClient()
    const { data, error } = await off.getProductV2(barcode)

    if (error || !data || data.status !== 1 || !data.product) {
      return { found: false, product: undefined }
    }

    // The SDK product type is a union; cast to access standard OBF fields
    const p = data.product as Record<string, unknown>
    return {
      found: true,
      product: {
        product_name: typeof p.product_name === "string" ? p.product_name : undefined,
        generic_name: typeof p.generic_name === "string" ? p.generic_name : undefined,
        abbreviated_product_name: typeof p.abbreviated_product_name === "string" ? p.abbreviated_product_name : undefined,
        brands: typeof p.brands === "string" ? p.brands : undefined,
        image_url: typeof p.image_url === "string" ? p.image_url : undefined,
        ingredients_text: typeof p.ingredients_text === "string" ? p.ingredients_text : undefined,
        categories: typeof p.categories === "string" ? p.categories : undefined,
        categories_tags: Array.isArray(p.categories_tags) ? p.categories_tags as string[] : undefined,
      },
    }
  } catch {
    return { found: false, product: undefined }
  }
}

const OBF_SEARCH_BASE = "https://world.openbeautyfacts.org/cgi/search.pl"

interface ObfSearchRawProduct {
  product_name?: string
  brands?: string
  image_url?: string
  ingredients_text?: string
  categories?: string
  code?: string
}

/**
 * Search Open Beauty Facts by product name.
 * Uses the classic search.pl endpoint with free-text query.
 * Returns up to `limit` results (default 5).
 */
export async function searchObfByName(
  query: string,
  limit = 5,
): Promise<ObfProduct[]> {
  if (!query.trim()) return []

  try {
    const url = new URL(OBF_SEARCH_BASE)
    url.searchParams.set("search_terms", query.trim())
    url.searchParams.set("search_simple", "1")
    url.searchParams.set("action", "process")
    url.searchParams.set("json", "1")
    url.searchParams.set("page_size", String(limit))
    url.searchParams.set("fields", "product_name,brands,image_url,ingredients_text,categories,code")

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return []

    const data = (await res.json()) as { products?: ObfSearchRawProduct[] }
    if (!Array.isArray(data.products)) return []

    return data.products
      .filter((p) => p.product_name)
      .map((p) => ({
        product_name: p.product_name,
        brands: p.brands,
        image_url: p.image_url,
        ingredients_text: p.ingredients_text,
        categories: p.categories,
      }))
  } catch {
    return []
  }
}
