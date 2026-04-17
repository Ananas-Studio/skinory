// ─── Subscription Tier Definitions ───────────────────────────────────────────
// Config-driven approach: single source of truth for tiers & limits.
// Currently only "demo" exists. Add new tiers here when needed.

export const USAGE_CATEGORIES = [
  "ai_evaluation",
  "ai_advice",
  "ai_social_detect",
  "scan_resolve",
  "scan_ocr",
  "scan_image_recognize",
  "routine_generate",
  "social_scrape",
  "social_enrich",
] as const

export type UsageCategory = (typeof USAGE_CATEGORIES)[number]

export const USAGE_CATEGORY_LABELS: Record<UsageCategory, string> = {
  ai_evaluation: "AI Product Evaluation",
  ai_advice: "AI Skincare Adviser",
  ai_social_detect: "AI Social Scan",
  scan_resolve: "Product Scan",
  scan_ocr: "OCR Scan",
  scan_image_recognize: "Image Recognition Scan",
  routine_generate: "Routine Generation",
  social_scrape: "Social Scrape",
  social_enrich: "Social Enrich",
}

export interface TierLimits {
  ai_evaluation: number
  ai_advice: number
  ai_social_detect: number
  scan_resolve: number
  scan_ocr: number
  scan_image_recognize: number
  routine_generate: number
  social_scrape: number
  social_enrich: number
}

export interface SubscriptionTier {
  id: string
  name: string
  description: string
  limits: TierLimits
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  demo: {
    id: "demo",
    name: "Demo",
    description: "Free demo plan with limited usage",
    limits: {
      ai_evaluation: 3,
      ai_advice: 5,
      ai_social_detect: 10,
      scan_resolve: 100,
      scan_ocr: 20,
      scan_image_recognize: 20,
      routine_generate: 10,
      social_scrape: 30,
      social_enrich: 20,
    },
  },
}

export const DEFAULT_TIER_ID = "demo"

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTier(tierId: string): SubscriptionTier {
  return SUBSCRIPTION_TIERS[tierId] ?? SUBSCRIPTION_TIERS[DEFAULT_TIER_ID]
}

export function getLimitForCategory(
  tierId: string,
  category: UsageCategory,
): number {
  const tier = getTier(tierId)
  return tier.limits[category]
}

export function getRemaining(used: number, limit: number): number {
  return Math.max(0, limit - used)
}

export function isLimitExceeded(used: number, limit: number): boolean {
  return used >= limit
}

export function isAiCategory(category: UsageCategory): boolean {
  return (
    category === "ai_evaluation" ||
    category === "ai_advice" ||
    category === "ai_social_detect" ||
    category === "scan_ocr" ||
    category === "scan_image_recognize"
  )
}
