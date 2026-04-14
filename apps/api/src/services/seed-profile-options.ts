import { getModels } from "../models/index.js"
import {
  ALLERGENS,
  PRODUCT_PREFERENCES,
} from "@skinory/core"

// ─── Seed allergens & product preferences ────────────────────────────────────

export async function seedProfileOptions(): Promise<void> {
  const { Allergen, ProductPreference } = getModels()

  // Seed allergens (upsert by slug)
  for (const a of ALLERGENS) {
    await Allergen.findOrCreate({
      where: { slug: a.slug },
      defaults: { slug: a.slug, name: a.name, category: a.category },
    })
  }
  console.log(`[seed] ${ALLERGENS.length} allergens synced`)

  // Seed product preferences (upsert by slug)
  for (const p of PRODUCT_PREFERENCES) {
    await ProductPreference.findOrCreate({
      where: { slug: p.slug },
      defaults: { slug: p.slug, name: p.name, category: p.category },
    })
  }
  console.log(`[seed] ${PRODUCT_PREFERENCES.length} product preferences synced`)
}
