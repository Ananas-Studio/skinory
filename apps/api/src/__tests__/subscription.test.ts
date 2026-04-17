import { describe, it, expect } from "vitest"
import {
  USAGE_CATEGORIES,
  getTier,
  DEFAULT_TIER_ID,
  getRemaining,
  isLimitExceeded,
  isAiCategory,
  USAGE_CATEGORY_LABELS,
} from "@skinory/core"

describe("subscription tier config", () => {
  it("defines all 9 usage categories", () => {
    expect(USAGE_CATEGORIES).toHaveLength(9)
    expect(USAGE_CATEGORIES).toContain("ai_evaluation")
    expect(USAGE_CATEGORIES).toContain("ai_advice")
    expect(USAGE_CATEGORIES).toContain("ai_social_detect")
    expect(USAGE_CATEGORIES).toContain("scan_resolve")
    expect(USAGE_CATEGORIES).toContain("routine_generate")
    expect(USAGE_CATEGORIES).toContain("scan_ocr")
    expect(USAGE_CATEGORIES).toContain("scan_image_recognize")
    expect(USAGE_CATEGORIES).toContain("social_scrape")
    expect(USAGE_CATEGORIES).toContain("social_enrich")
  })

  it("has labels for all categories", () => {
    for (const cat of USAGE_CATEGORIES) {
      expect(USAGE_CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })

  it("demo tier has limits for all categories", () => {
    const tier = getTier(DEFAULT_TIER_ID)
    for (const cat of USAGE_CATEGORIES) {
      expect(tier.limits[cat]).toBeGreaterThan(0)
    }
  })

  it("returns demo tier for unknown tier id", () => {
    const tier = getTier("nonexistent")
    expect(tier.id).toBe("demo")
  })

  it("getRemaining calculates correctly", () => {
    expect(getRemaining(3, 5)).toBe(2)
    expect(getRemaining(5, 5)).toBe(0)
    expect(getRemaining(10, 5)).toBe(0) // no negatives
  })

  it("isLimitExceeded is correct", () => {
    expect(isLimitExceeded(4, 5)).toBe(false)
    expect(isLimitExceeded(5, 5)).toBe(true)
    expect(isLimitExceeded(6, 5)).toBe(true)
  })

  it("determinism: same input produces same output", () => {
    const tier1 = getTier(DEFAULT_TIER_ID)
    const tier2 = getTier(DEFAULT_TIER_ID)
    expect(JSON.stringify(tier1)).toBe(JSON.stringify(tier2))
  })

  it("isAiCategory identifies AI categories correctly", () => {
    expect(isAiCategory("ai_evaluation")).toBe(true)
    expect(isAiCategory("ai_advice")).toBe(true)
    expect(isAiCategory("ai_social_detect")).toBe(true)
    expect(isAiCategory("scan_ocr")).toBe(true)
    expect(isAiCategory("scan_image_recognize")).toBe(true)
    expect(isAiCategory("scan_resolve")).toBe(false)
    expect(isAiCategory("routine_generate")).toBe(false)
    expect(isAiCategory("social_scrape")).toBe(false)
    expect(isAiCategory("social_enrich")).toBe(false)
  })
})
