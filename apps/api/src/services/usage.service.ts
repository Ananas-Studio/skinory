import { Op } from "sequelize"
import {
  type UsageCategory,
  USAGE_CATEGORIES,
  getTier,
  DEFAULT_TIER_ID,
  getRemaining,
  isLimitExceeded,
} from "@skinory/core"
import { getModels } from "../models/index.js"

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const { UsageLog } = getModels()
  const tier = getTier(DEFAULT_TIER_ID)
  const monthStart = startOfMonth()

  const rows = await UsageLog.findAll({
    where: {
      userId,
      createdAt: { [Op.gte]: monthStart },
    },
    attributes: ["category"],
  })

  const counts = new Map<string, number>()
  for (const row of rows) {
    const cat = row.category
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }

  const limits = {} as Record<UsageCategory, CategoryUsage>
  for (const cat of USAGE_CATEGORIES) {
    const used = counts.get(cat) ?? 0
    const limit = tier.limits[cat]
    limits[cat] = { used, limit, remaining: getRemaining(used, limit) }
  }

  return { tier: tier.id, tierName: tier.name, limits }
}

export async function recordUsage(
  userId: string,
  category: UsageCategory,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { UsageLog } = getModels()
  await UsageLog.create({ userId, category, metadata: metadata ?? null })
}

export async function checkLimit(
  userId: string,
  category: UsageCategory,
): Promise<void> {
  const { UsageLog } = getModels()
  const tier = getTier(DEFAULT_TIER_ID)
  const limit = tier.limits[category]
  const monthStart = startOfMonth()

  const used = await UsageLog.count({
    where: {
      userId,
      category,
      createdAt: { [Op.gte]: monthStart },
    },
  })

  if (isLimitExceeded(used, limit)) {
    const err = new Error(
      `Monthly limit reached for this feature (${used}/${limit}). Upgrade your plan for more usage.`,
    ) as Error & { statusCode: number; code: string }
    err.statusCode = 403
    err.code = "USAGE_LIMIT_EXCEEDED"
    throw err
  }
}
