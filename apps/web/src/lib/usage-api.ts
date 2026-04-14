import type { UsageCategory } from '@skinory/core'

const API_BASE = '/api/profile'

function headers(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CategoryUsage {
  used: number
  limit: number
  remaining: number
}

export interface UsageSummary {
  tier: string
  tierName: string
  limits: Record<UsageCategory, CategoryUsage>
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function fetchUsage(userId: string): Promise<UsageSummary> {
  const res = await fetch(`${API_BASE}/usage`, {
    method: 'GET',
    headers: headers(userId),
  })
  const json = await res.json()
  if (!json.ok) {
    throw new Error(json.error?.message ?? 'Failed to fetch usage data')
  }
  return json.data
}
