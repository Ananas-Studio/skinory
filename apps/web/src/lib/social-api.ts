const API_BASE = '/api/social'

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MatchType = 'exact' | 'fuzzy' | 'possible'

export interface DetectedProduct {
  brand: string | null
  name: string | null
  confidence: number
}

export interface ProductMatch {
  productId: string
  brand: string | null
  name: string
  imageUrl: string | null
  matchType: MatchType
  confidence: number
}

export interface SocialAnalysisResult {
  platform: string
  resourceType: string | null
  preview: {
    text: string | null
    author: string | null
    thumbnail: string | null
  }
  detectedProducts: DetectedProduct[]
  matches: ProductMatch[]
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function analyzeLink(
  userId: string,
  url: string,
): Promise<SocialAnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ url }),
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to analyze link')
  }

  return json.data as SocialAnalysisResult
}
