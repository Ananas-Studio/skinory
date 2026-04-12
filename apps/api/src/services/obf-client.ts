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
  brands?: string
  image_url?: string
  ingredients_text?: string
  categories?: string
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
        brands: typeof p.brands === "string" ? p.brands : undefined,
        image_url: typeof p.image_url === "string" ? p.image_url : undefined,
        ingredients_text: typeof p.ingredients_text === "string" ? p.ingredients_text : undefined,
        categories: typeof p.categories === "string" ? p.categories : undefined,
      },
    }
  } catch {
    return { found: false, product: undefined }
  }
}
