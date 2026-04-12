/**
 * Seed script — populates demo product data for the evaluation feature.
 * Run: npx tsx apps/api/src/scripts/seed-demo.ts
 */
import 'dotenv/config'
import { Sequelize } from 'sequelize'
import { env } from '../config/env.js'
import { initModels, getModels } from '../models/index.js'

const DEMO_USER_ID = 'ac0fcc6b-7d52-43a7-bcb7-d6b2e9611cb7'

async function seed() {
  const sequelize = new Sequelize(env.databaseUrl, {
    dialect: 'postgres',
    username: env.username,
    password: env.password,
    logging: false,
  })

  initModels(sequelize)
  await sequelize.authenticate()
  await sequelize.sync()
  console.log('✅ Database connected & synced')

  const {
    Brand,
    Product,
    Ingredient,
    ProductIngredient,
    SkinProfile,
    SkinConcern,
    UserSkinConcern,
    Inventory,
  } = getModels()

  // --- Brand ---
  const [brand] = await Brand.findOrCreate({
    where: { slug: 'cerave' },
    defaults: { name: 'CeraVe', slug: 'cerave', websiteUrl: 'https://www.cerave.com', countryCode: 'US' },
  })
  console.log(`  Brand: ${brand.name} (${brand.id})`)

  // --- Product ---
  const [product] = await Product.findOrCreate({
    where: { slug: 'cerave-hydrating-facial-cleanser' },
    defaults: {
      brandId: brand.id,
      name: 'Hydrating Facial Cleanser',
      slug: 'cerave-hydrating-facial-cleanser',
      category: 'skincare',
      subcategory: 'cleanser',
      productForm: 'gel',
      description:
        'A gentle, non-foaming cleanser that hydrates while removing dirt and makeup. Contains 3 essential ceramides and hyaluronic acid.',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&q=80',
      sourceType: 'manual_import',
      sourceConfidence: '0.9500',
      isActive: true,
    },
  })
  console.log(`  Product: ${product.name} (${product.id})`)

  // --- Ingredients ---
  const ingredientData = [
    { inciName: 'Ceramide NP', displayName: 'Ceramide 3', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Ceramide AP', displayName: 'Ceramide 6-II', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Ceramide EOP', displayName: 'Ceramide 1', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Hyaluronic Acid', displayName: 'Hyaluronic Acid', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Glycerin', displayName: 'Glycerin', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: false },
    { inciName: 'Niacinamide', displayName: 'Niacinamide (Vitamin B3)', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Cholesterol', displayName: 'Cholesterol', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: false },
    { inciName: 'Phytosphingosine', displayName: 'Phytosphingosine', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: true },
    { inciName: 'Sodium Lauroyl Lactylate', displayName: 'Sodium Lauroyl Lactylate', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: false },
    { inciName: 'Aqua', displayName: 'Water', comedogenicRating: 0, isPotentialAllergen: false, isActiveIngredient: false },
  ]

  for (let i = 0; i < ingredientData.length; i++) {
    const data = ingredientData[i]
    const [ingredient] = await Ingredient.findOrCreate({
      where: { inciName: data.inciName },
      defaults: data,
    })

    await ProductIngredient.findOrCreate({
      where: { productId: product.id, ingredientId: ingredient.id },
      defaults: {
        productId: product.id,
        ingredientId: ingredient.id,
        ingredientOrder: i + 1,
        rawLabel: data.inciName,
      },
    })
  }
  console.log(`  Ingredients: ${ingredientData.length} linked`)

  // --- Skin Profile for demo user ---
  await SkinProfile.findOrCreate({
    where: { userId: DEMO_USER_ID },
    defaults: {
      userId: DEMO_USER_ID,
      skinType: 'dry',
      sensitivityLevel: 'medium',
      acneProne: false,
      notes: 'Prefers fragrance-free, hydrating products',
    },
  })
  console.log(`  SkinProfile: dry / medium sensitivity`)

  // --- Skin Concerns ---
  const concerns = [
    { slug: 'dryness', name: 'Dryness' },
    { slug: 'redness', name: 'Redness' },
    { slug: 'sensitivity', name: 'Sensitivity' },
  ]

  for (const c of concerns) {
    const [concern] = await SkinConcern.findOrCreate({
      where: { slug: c.slug },
      defaults: c,
    })
    await UserSkinConcern.findOrCreate({
      where: { userId: DEMO_USER_ID, concernId: concern.id },
      defaults: { userId: DEMO_USER_ID, concernId: concern.id, severity: 2 },
    })
  }
  console.log(`  SkinConcerns: ${concerns.length} linked to user`)

  // --- Inventory ---
  await Inventory.findOrCreate({
    where: { userId: DEMO_USER_ID },
    defaults: { userId: DEMO_USER_ID, name: 'My Inventory', isActive: true },
  })
  console.log(`  Inventory: created`)

  console.log('\n🎉 Seed complete!')
  console.log(`   Product ID: ${product.id}`)
  console.log(`   Use this product ID for evaluation testing.\n`)

  await sequelize.close()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
