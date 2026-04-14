export const coreVersion = "0.0.1";

export {
  type NormalizedIngredient,
  type ParseResult,
  INGREDIENT_ALIASES,
  normalizeInciName,
  parseIngredientString,
} from "./ingredients.js";

export {
  // Skin Types
  SKIN_TYPES,
  SKIN_TYPE_LABELS,
  type SkinType,

  // Fitzpatrick
  FITZPATRICK_TYPES,
  FITZPATRICK_INFO,
  type FitzpatrickType,
  type FitzpatrickInfo,

  // Sensitivity
  SENSITIVITY_LEVELS,
  SENSITIVITY_LABELS,
  type SensitivityLevel,

  // Skin Concerns
  SKIN_CONCERNS,
  SKIN_CONCERN_LABELS,
  type SkinConcern,

  // Allergens
  ALLERGENS,
  ALLERGEN_CATEGORIES,
  ALLERGEN_CATEGORY_LABELS,
  type AllergenOption,

  // Product Preferences
  PRODUCT_PREFERENCES,
  PREFERENCE_CATEGORIES,
  PREFERENCE_CATEGORY_LABELS,
  type PreferenceOption,

  // Climate
  CLIMATE_TYPES,
  CLIMATE_LABELS,
  type ClimateType,

  // Lifestyle
  SCALE_LABELS,
  EXERCISE_FREQUENCIES,
  EXERCISE_LABELS,
  type ExerciseFrequency,
  DIET_TYPES,
  DIET_LABELS,
  type DietType,
  SMOKING_STATUSES,
  SMOKING_LABELS,
  type SmokingStatus,

  // Gender
  GENDERS,
  GENDER_LABELS,
  type Gender,
} from "./skin-profile.js";
