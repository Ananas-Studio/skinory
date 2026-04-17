import { Op, fn, col } from "sequelize"
import {
  type UsageCategory,
  USAGE_CATEGORIES,
  getTier,
  DEFAULT_TIER_ID,
  getRemaining,
} from "@skinory/core"
import { getModels } from "../models/index.js"
import { sequelize } from "../config/database.js"

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
    attributes: ["category", [fn("COUNT", col("id")), "count"]],
    group: ["category"],
    raw: true,
  })

  const counts = new Map<string, number>()
  for (const row of rows as unknown as { category: string; count: string }[]) {
    counts.set(row.category, parseInt(row.count, 10))
  }

  const limits = {} as Record<UsageCategory, CategoryUsage>
  for (const cat of USAGE_CATEGORIES) {
    const used = counts.get(cat) ?? 0
    const limit = tier.limits[cat]
    limits[cat] = { used, limit, remaining: getRemaining(used, limit) }
  }

  return { tier: tier.id, tierName: tier.name, limits }
}

// Prefer checkAndRecordUsage for new code — it is atomic and avoids race conditions.
export async function recordUsage(
  userId: string,
  category: UsageCategory,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { UsageLog } = getModels()
  await UsageLog.create({ userId, category, metadata: metadata ?? null })
}

/**
 * Atomically checks the monthly limit and records usage in a single SQL statement.
 * If the limit is already reached, throws USAGE_LIMIT_EXCEEDED without inserting.
 */
export async function checkAndRecordUsage(
  userId: string,
  category: UsageCategory,
): Promise<void> {
  const tier = getTier(DEFAULT_TIER_ID)
  const limit = tier.limits[category]
  const monthStart = startOfMonth()

  const [results] = await sequelize.query(
    `INSERT INTO usage_logs (id, user_id, category, created_at)
     SELECT gen_random_uuid(), :userId, :category, NOW()
     WHERE (
       SELECT COUNT(*) FROM usage_logs
       WHERE user_id = :userId AND category = :category AND created_at >= :monthStart
     ) < :limit
     RETURNING id`,
    {
      replacements: { userId, category, monthStart, limit },
    },
  )

  if (!results || (results as unknown[]).length === 0) {
    const err = new Error(
      `Monthly limit reached for this feature. Upgrade your plan for more usage.`,
    ) as Error & { statusCode: number; code: string }
    err.statusCode = 403
    err.code = "USAGE_LIMIT_EXCEEDED"
    throw err
  }
}
