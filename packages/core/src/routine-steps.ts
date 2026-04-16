// ─── Skincare Routine Step Definitions ───
// Dermatological ordering, conflict rules, and category mapping.
// Single source of truth — consumed by both API engine and frontend.

// ─── Step Categories ───

export const ROUTINE_STEP_CATEGORIES = [
  "cleansing",
  "toning",
  "serum",
  "eye_cream",
  "moisturizing",
  "sun_protection",
  "face_oil",
] as const
export type RoutineStepCategory = (typeof ROUTINE_STEP_CATEGORIES)[number]

export const ROUTINE_STEP_LABELS: Record<RoutineStepCategory, string> = {
  cleansing: "Cleansing",
  toning: "Toning",
  serum: "Serum / Treatment",
  eye_cream: "Eye Cream",
  moisturizing: "Moisturizing",
  sun_protection: "Sun Protection",
  face_oil: "Face Oil / Night Mask",
}

export const ROUTINE_STEP_ICONS: Record<RoutineStepCategory, string> = {
  cleansing: "💧",
  toning: "🧴",
  serum: "💉",
  eye_cream: "👁️",
  moisturizing: "🧊",
  sun_protection: "☀️",
  face_oil: "🌙",
}

// ─── Time of Day ───

export const ROUTINE_TIMES = ["morning", "evening"] as const
export type RoutineTime = (typeof ROUTINE_TIMES)[number]

// ─── Safety-Aware Step Ordering (single source of truth) ───

export const MORNING_STEP_ORDER: readonly RoutineStepCategory[] = [
  "cleansing",
  "toning",
  "serum",
  "eye_cream",
  "moisturizing",
  "sun_protection",
] as const

export const EVENING_STEP_ORDER: readonly RoutineStepCategory[] = [
  "cleansing",
  "toning",
  "serum",
  "eye_cream",
  "moisturizing",
  "face_oil",
] as const

export const STEP_ORDER_MAP: Record<RoutineTime, readonly RoutineStepCategory[]> = {
  morning: MORNING_STEP_ORDER,
  evening: EVENING_STEP_ORDER,
}

// ─── Product Subcategory → Step Category Mapping ───

export const PRODUCT_TO_STEP_MAP: Record<string, RoutineStepCategory> = {
  // ─── Cleansing ─────────────────────────────────────────────────────────
  cleanser: "cleansing",
  "foam cleanser": "cleansing",
  "oil cleanser": "cleansing",
  "micellar water": "cleansing",
  "cleansing balm": "cleansing",
  wash: "cleansing",
  "facial wash": "cleansing",
  "face wash": "cleansing",
  // Turkish
  temizleyici: "cleansing",
  arindirici: "cleansing",
  yikama: "cleansing",

  // ─── Toning ────────────────────────────────────────────────────────────
  toner: "toning",
  essence: "toning",
  mist: "toning",
  // Turkish
  tonik: "toning",

  // ─── Serum / Treatment ─────────────────────────────────────────────────
  serum: "serum",
  treatment: "serum",
  ampoule: "serum",
  "spot treatment": "serum",
  retinol: "serum",
  niacinamide: "serum",

  // ─── Eye cream ─────────────────────────────────────────────────────────
  "eye cream": "eye_cream",
  "eye serum": "eye_cream",
  "eye gel": "eye_cream",
  // Turkish
  "goz kremi": "eye_cream",
  "goz serumu": "eye_cream",

  // ─── Moisturizing ──────────────────────────────────────────────────────
  moisturizer: "moisturizing",
  cream: "moisturizing",
  lotion: "moisturizing",
  "gel cream": "moisturizing",
  "night cream": "moisturizing",
  // Turkish
  nemlendirici: "moisturizing",
  krem: "moisturizing",
  losyon: "moisturizing",

  // ─── Sun protection ────────────────────────────────────────────────────
  sunscreen: "sun_protection",
  spf: "sun_protection",
  "sun cream": "sun_protection",
  "uv protection": "sun_protection",
  // Turkish
  "gunes kremi": "sun_protection",
  "gunes koruma": "sun_protection",

  // ─── Face oil / sleeping mask ──────────────────────────────────────────
  "face oil": "face_oil",
  "facial oil": "face_oil",
  "sleeping mask": "face_oil",
  "night mask": "face_oil",
  // Turkish
  "yuz yagi": "face_oil",

  // ─── Exfoliation (maps to serum step) ──────────────────────────────────
  exfoliant: "serum",
  exfoliator: "serum",
  peel: "serum",
  peeling: "serum",
  scrub: "serum",

  // ─── Mask (maps to serum step) ─────────────────────────────────────────
  mask: "serum",
  maske: "serum",
}

// ─── Ingredient Conflict Rules ───

export type ConflictSeverity = "caution" | "block"

export interface ConflictRule {
  id: string
  ingredientA: string
  ingredientB: string
  severity: ConflictSeverity
  reasonCode: string
  message: string
}

export const INGREDIENT_CONFLICT_RULES: readonly ConflictRule[] = [
  {
    id: "retinol-aha-bha",
    ingredientA: "retinol",
    ingredientB: "aha",
    severity: "caution",
    reasonCode: "RETINOL_AHA_CONFLICT",
    message: "Retinol and AHA/BHA should not be layered together — alternate nights instead.",
  },
  {
    id: "retinol-bha",
    ingredientA: "retinol",
    ingredientB: "bha",
    severity: "caution",
    reasonCode: "RETINOL_BHA_CONFLICT",
    message: "Retinol and BHA (Salicylic Acid) can cause excessive irritation when combined.",
  },
  {
    id: "retinol-vitamin-c",
    ingredientA: "retinol",
    ingredientB: "vitamin_c",
    severity: "caution",
    reasonCode: "RETINOL_VITC_CONFLICT",
    message: "Retinol and Vitamin C work at different pH levels — use Vitamin C in morning, Retinol at night.",
  },
  {
    id: "retinol-benzoyl-peroxide",
    ingredientA: "retinol",
    ingredientB: "benzoyl_peroxide",
    severity: "caution",
    reasonCode: "RETINOL_BP_CONFLICT",
    message: "Benzoyl Peroxide can deactivate Retinol — avoid using in the same routine.",
  },
  {
    id: "aha-vitamin-c",
    ingredientA: "aha",
    ingredientB: "vitamin_c",
    severity: "caution",
    reasonCode: "AHA_VITC_CONFLICT",
    message: "AHA and Vitamin C are both low-pH actives — layering may cause irritation.",
  },
  {
    id: "bha-vitamin-c",
    ingredientA: "bha",
    ingredientB: "vitamin_c",
    severity: "caution",
    reasonCode: "BHA_VITC_CONFLICT",
    message: "BHA and Vitamin C may reduce each other's efficacy when layered together.",
  },
] as const

// ─── Conflict Detection (pure function) ───

export interface DetectedConflict {
  rule: ConflictRule
  productA: string
  productB: string
}

interface ConflictCheckItem {
  productName: string
  ingredientSlugs: string[]
}

const conflictIndex = new Map<string, ConflictRule[]>()
for (const rule of INGREDIENT_CONFLICT_RULES) {
  const keyAB = `${rule.ingredientA}::${rule.ingredientB}`
  const keyBA = `${rule.ingredientB}::${rule.ingredientA}`
  conflictIndex.set(keyAB, [...(conflictIndex.get(keyAB) ?? []), rule])
  conflictIndex.set(keyBA, [...(conflictIndex.get(keyBA) ?? []), rule])
}

export function detectConflicts(items: ConflictCheckItem[]): DetectedConflict[] {
  const conflicts: DetectedConflict[] = []
  const seen = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const slugA of items[i].ingredientSlugs) {
        for (const slugB of items[j].ingredientSlugs) {
          const key = `${slugA}::${slugB}`
          const rules = conflictIndex.get(key)
          if (!rules) continue

          for (const rule of rules) {
            const conflictKey = `${rule.id}::${items[i].productName}::${items[j].productName}`
            if (seen.has(conflictKey)) continue
            seen.add(conflictKey)

            conflicts.push({
              rule,
              productA: items[i].productName,
              productB: items[j].productName,
            })
          }
        }
      }
    }
  }

  return conflicts
}

// ─── Step Order Helper ───

export function getStepOrder(
  timeOfDay: RoutineTime,
  category: RoutineStepCategory,
): number {
  const order = STEP_ORDER_MAP[timeOfDay]
  const idx = order.indexOf(category)
  return idx === -1 ? order.length : idx
}
