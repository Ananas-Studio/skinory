// ─── Skin & Health Profile Constants ───
// International standards for skincare profiling

// ─── Skin Types ───

export const SKIN_TYPES = [
  "normal",
  "oily",
  "dry",
  "combination",
  "sensitive",
] as const
export type SkinType = (typeof SKIN_TYPES)[number]

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  normal: "Normal",
  oily: "Oily",
  dry: "Dry",
  combination: "Combination",
  sensitive: "Sensitive",
}

// ─── Fitzpatrick Phototype Scale (I–VI) ───

export const FITZPATRICK_TYPES = ["I", "II", "III", "IV", "V", "VI"] as const
export type FitzpatrickType = (typeof FITZPATRICK_TYPES)[number]

export interface FitzpatrickInfo {
  label: string
  description: string
  color: string
}

export const FITZPATRICK_INFO: Record<FitzpatrickType, FitzpatrickInfo> = {
  I: {
    label: "Type I",
    description: "Very fair — always burns, never tans",
    color: "#FDEBD0",
  },
  II: {
    label: "Type II",
    description: "Fair — burns easily, tans minimally",
    color: "#F5CBA7",
  },
  III: {
    label: "Type III",
    description: "Medium — sometimes burns, tans gradually",
    color: "#E0B88A",
  },
  IV: {
    label: "Type IV",
    description: "Olive — rarely burns, tans easily",
    color: "#C49A6C",
  },
  V: {
    label: "Type V",
    description: "Brown — very rarely burns, tans very easily",
    color: "#A0714F",
  },
  VI: {
    label: "Type VI",
    description: "Deep brown/black — never burns",
    color: "#6B4226",
  },
}

// ─── Sensitivity Levels ───

export const SENSITIVITY_LEVELS = ["low", "medium", "high"] as const
export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number]

export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

// ─── Skin Concerns ───

export const SKIN_CONCERNS = [
  "acne",
  "wrinkles",
  "fine_lines",
  "hyperpigmentation",
  "dark_spots",
  "redness",
  "rosacea",
  "dryness",
  "dehydration",
  "oiliness",
  "enlarged_pores",
  "dark_circles",
  "eczema",
  "psoriasis",
  "sun_damage",
  "blackheads",
  "whiteheads",
  "scarring",
  "sensitivity",
  "uneven_texture",
  "dullness",
  "sagging",
  "melasma",
  "stretch_marks",
] as const
export type SkinConcern = (typeof SKIN_CONCERNS)[number]

export const SKIN_CONCERN_LABELS: Record<SkinConcern, string> = {
  acne: "Acne",
  wrinkles: "Wrinkles",
  fine_lines: "Fine Lines",
  hyperpigmentation: "Hyperpigmentation",
  dark_spots: "Dark Spots",
  redness: "Redness",
  rosacea: "Rosacea",
  dryness: "Dryness",
  dehydration: "Dehydration",
  oiliness: "Oiliness",
  enlarged_pores: "Enlarged Pores",
  dark_circles: "Dark Circles",
  eczema: "Eczema",
  psoriasis: "Psoriasis",
  sun_damage: "Sun Damage",
  blackheads: "Blackheads",
  whiteheads: "Whiteheads",
  scarring: "Scarring",
  sensitivity: "Sensitivity",
  uneven_texture: "Uneven Texture",
  dullness: "Dullness",
  sagging: "Sagging",
  melasma: "Melasma",
  stretch_marks: "Stretch Marks",
}

// ─── Allergens & Sensitivities ───

export interface AllergenOption {
  slug: string
  name: string
  category: string
}

export const ALLERGEN_CATEGORIES = [
  "common_irritants",
  "chemical",
  "natural_food",
] as const

export const ALLERGEN_CATEGORY_LABELS: Record<
  (typeof ALLERGEN_CATEGORIES)[number],
  string
> = {
  common_irritants: "Common Irritants",
  chemical: "Chemical Sensitivities",
  natural_food: "Natural & Food Allergens",
}

export const ALLERGENS: AllergenOption[] = [
  // Common Irritants
  { slug: "fragrance", name: "Fragrance / Parfum", category: "common_irritants" },
  { slug: "essential_oils", name: "Essential Oils", category: "common_irritants" },
  { slug: "alcohol_denat", name: "Alcohol Denat", category: "common_irritants" },
  { slug: "retinol", name: "Retinol / Retinoids", category: "common_irritants" },
  { slug: "aha", name: "AHA (Glycolic, Lactic Acid)", category: "common_irritants" },
  { slug: "bha", name: "BHA (Salicylic Acid)", category: "common_irritants" },
  { slug: "vitamin_c", name: "Vitamin C (Ascorbic Acid)", category: "common_irritants" },
  { slug: "benzoyl_peroxide", name: "Benzoyl Peroxide", category: "common_irritants" },

  // Chemical Sensitivities
  { slug: "parabens", name: "Parabens", category: "chemical" },
  { slug: "sulfates", name: "Sulfates (SLS/SLES)", category: "chemical" },
  { slug: "silicones", name: "Silicones", category: "chemical" },
  { slug: "formaldehyde", name: "Formaldehyde Releasers", category: "chemical" },
  { slug: "peg_compounds", name: "PEG Compounds", category: "chemical" },
  { slug: "phenoxyethanol", name: "Phenoxyethanol", category: "chemical" },
  { slug: "phthalates", name: "Phthalates", category: "chemical" },
  { slug: "nickel", name: "Nickel", category: "chemical" },

  // Natural & Food Allergens
  { slug: "lanolin", name: "Lanolin", category: "natural_food" },
  { slug: "latex", name: "Latex", category: "natural_food" },
  { slug: "gluten", name: "Gluten", category: "natural_food" },
  { slug: "soy", name: "Soy", category: "natural_food" },
  { slug: "coconut", name: "Coconut Derivatives", category: "natural_food" },
  { slug: "tree_nuts", name: "Tree Nuts", category: "natural_food" },
  { slug: "bee_products", name: "Bee Products (Propolis, Beeswax)", category: "natural_food" },
  { slug: "aloe_vera", name: "Aloe Vera", category: "natural_food" },
]

// ─── Product Preferences ───

export interface PreferenceOption {
  slug: string
  name: string
  category: string
}

export const PREFERENCE_CATEGORIES = [
  "lifestyle",
  "safety",
  "ingredient_free",
] as const

export const PREFERENCE_CATEGORY_LABELS: Record<
  (typeof PREFERENCE_CATEGORIES)[number],
  string
> = {
  lifestyle: "Lifestyle",
  safety: "Safety & Testing",
  ingredient_free: "Ingredient-Free",
}

export const PRODUCT_PREFERENCES: PreferenceOption[] = [
  // Lifestyle
  { slug: "vegan", name: "Vegan", category: "lifestyle" },
  { slug: "cruelty_free", name: "Cruelty-Free", category: "lifestyle" },
  { slug: "organic", name: "Organic / Certified Organic", category: "lifestyle" },
  { slug: "natural", name: "Natural / Naturally Derived", category: "lifestyle" },
  { slug: "clean_beauty", name: "Clean Beauty", category: "lifestyle" },
  { slug: "reef_safe", name: "Reef-Safe", category: "lifestyle" },
  { slug: "eco_friendly", name: "Eco-Friendly Packaging", category: "lifestyle" },

  // Safety & Testing
  { slug: "hypoallergenic", name: "Hypoallergenic", category: "safety" },
  { slug: "dermatologist_tested", name: "Dermatologist Tested", category: "safety" },
  { slug: "clinically_tested", name: "Clinically Tested", category: "safety" },
  { slug: "non_comedogenic", name: "Non-Comedogenic", category: "safety" },
  { slug: "ewg_verified", name: "EWG Verified", category: "safety" },
  { slug: "non_gmo", name: "Non-GMO", category: "safety" },

  // Ingredient-Free
  { slug: "fragrance_free", name: "Fragrance-Free", category: "ingredient_free" },
  { slug: "paraben_free", name: "Paraben-Free", category: "ingredient_free" },
  { slug: "sulfate_free", name: "Sulfate-Free", category: "ingredient_free" },
  { slug: "alcohol_free", name: "Alcohol-Free", category: "ingredient_free" },
  { slug: "silicone_free", name: "Silicone-Free", category: "ingredient_free" },
  { slug: "gluten_free", name: "Gluten-Free", category: "ingredient_free" },
  { slug: "oil_free", name: "Oil-Free", category: "ingredient_free" },
]

// ─── Climate & Environment ───

export const CLIMATE_TYPES = [
  "tropical",
  "subtropical",
  "temperate",
  "continental",
  "arid",
  "mediterranean",
  "polar",
  "mountain",
] as const
export type ClimateType = (typeof CLIMATE_TYPES)[number]

export const CLIMATE_LABELS: Record<ClimateType, string> = {
  tropical: "Tropical (Hot & Humid)",
  subtropical: "Subtropical",
  temperate: "Temperate (Mild)",
  continental: "Continental (Cold Winters)",
  arid: "Arid / Desert (Dry)",
  mediterranean: "Mediterranean",
  polar: "Polar / Arctic (Very Cold)",
  mountain: "Mountain / High Altitude",
}

// ─── Lifestyle Scales (1–5) ───

export const SCALE_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
}

// ─── Exercise Frequency ───

export const EXERCISE_FREQUENCIES = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const
export type ExerciseFrequency = (typeof EXERCISE_FREQUENCIES)[number]

export const EXERCISE_LABELS: Record<ExerciseFrequency, string> = {
  sedentary: "Sedentary (0×/week)",
  light: "Light (1-2×/week)",
  moderate: "Moderate (3-4×/week)",
  active: "Active (5-6×/week)",
  very_active: "Very Active (Daily)",
}

// ─── Diet Types ───

export const DIET_TYPES = [
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "mediterranean",
  "paleo",
  "other",
] as const
export type DietType = (typeof DIET_TYPES)[number]

export const DIET_LABELS: Record<DietType, string> = {
  omnivore: "Omnivore",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  keto: "Ketogenic",
  mediterranean: "Mediterranean",
  paleo: "Paleo",
  other: "Other",
}

// ─── Smoking Status ───

export const SMOKING_STATUSES = [
  "non_smoker",
  "former",
  "occasional",
  "regular",
] as const
export type SmokingStatus = (typeof SMOKING_STATUSES)[number]

export const SMOKING_LABELS: Record<SmokingStatus, string> = {
  non_smoker: "Non-Smoker",
  former: "Former Smoker",
  occasional: "Occasional",
  regular: "Regular Smoker",
}

// ─── Gender ───

export const GENDERS = [
  "female",
  "male",
  "non_binary",
  "prefer_not_to_say",
] as const
export type Gender = (typeof GENDERS)[number]

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-Binary",
  prefer_not_to_say: "Prefer Not to Say",
}
