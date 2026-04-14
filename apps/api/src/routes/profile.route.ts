import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { getModels } from "../models/index.js"
import {
  SKIN_TYPES,
  SENSITIVITY_LEVELS,
  FITZPATRICK_TYPES,
  CLIMATE_TYPES,
  EXERCISE_FREQUENCIES,
  DIET_TYPES,
  SMOKING_STATUSES,
  GENDERS,
} from "../models/db-types.js"

const profileRouter = Router()

// ─── GET /profile ───────────────────────────────────────────────────────────

profileRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const { User, AuthIdentity, SkinProfile, SkinConcern, UserSkinConcern, UserAllergen, Allergen, UserProductPreference, ProductPreference } = getModels()

    const user = await User.findByPk(userId)
    if (!user) {
      res.status(404).json({ ok: false, error: { code: "USER_NOT_FOUND", message: "User not found" } })
      return
    }

    const connections = await AuthIdentity.findAll({
      where: { userId },
      order: [["createdAt", "ASC"]],
    })

    const skinProfile = await SkinProfile.findOne({ where: { userId } })

    const userConcerns = await UserSkinConcern.findAll({
      where: { userId },
      include: [{ model: SkinConcern, as: "concern" }],
    })

    const userAllergens = await UserAllergen.findAll({
      where: { userId },
      include: [{ model: Allergen, as: "allergen" }],
    })

    const userPreferences = await UserProductPreference.findAll({
      where: { userId },
      include: [{ model: ProductPreference, as: "preference" }],
    })

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          birthday: user.birthday,
          gender: user.gender,
          authProvider: user.authProvider,
          isGuest: user.isGuest,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        connections: connections.map((c) => ({
          id: c.id,
          provider: c.provider,
          providerUserId: c.providerUserId,
          email: c.email,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        skinProfile: skinProfile
          ? {
              skinType: skinProfile.skinType,
              sensitivityLevel: skinProfile.sensitivityLevel,
              fitzpatrickType: skinProfile.fitzpatrickType,
              acneProne: skinProfile.acneProne,
              notes: skinProfile.notes,
              climateType: skinProfile.climateType,
              sunExposure: skinProfile.sunExposure,
              pollutionExposure: skinProfile.pollutionExposure,
              stressLevel: skinProfile.stressLevel,
              sleepQuality: skinProfile.sleepQuality,
              hydrationLevel: skinProfile.hydrationLevel,
              exerciseFrequency: skinProfile.exerciseFrequency,
              dietType: skinProfile.dietType,
              smokingStatus: skinProfile.smokingStatus,
              screenTime: skinProfile.screenTime,
            }
          : null,
        skinConcerns: userConcerns.map((uc) => ({
          id: (uc as unknown as { concern: { id: string; slug: string; name: string } }).concern.id,
          slug: (uc as unknown as { concern: { slug: string } }).concern.slug,
          name: (uc as unknown as { concern: { name: string } }).concern.name,
          severity: uc.severity,
        })),
        allergens: userAllergens.map((ua) => {
          const a = (ua as unknown as { allergen: { id: string; slug: string; name: string; category: string } }).allergen
          return { id: a.id, slug: a.slug, name: a.name, category: a.category }
        }),
        productPreferences: userPreferences.map((up) => {
          const p = (up as unknown as { preference: { id: string; slug: string; name: string; category: string } }).preference
          return { id: p.id, slug: p.slug, name: p.name, category: p.category }
        }),
      },
    })
  } catch (error) {
    console.error("GET /profile error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load profile" } })
  }
})

// ─── PATCH /profile ─────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  avatarUrl: z.string().trim().url().optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  birthday: z.string().date().optional().nullable(),
  gender: z.enum(GENDERS as unknown as [string, ...string[]]).optional().nullable(),
})

profileRouter.patch("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const body = updateProfileSchema.parse(req.body)
    const { User } = getModels()

    const user = await User.findByPk(userId)
    if (!user) {
      res.status(404).json({ ok: false, error: { code: "USER_NOT_FOUND", message: "User not found" } })
      return
    }

    if (body.fullName !== undefined) user.fullName = body.fullName
    if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl
    if (body.phone !== undefined) user.phone = body.phone ?? null
    if (body.birthday !== undefined) user.birthday = body.birthday ? new Date(body.birthday) : null
    if (body.gender !== undefined) user.gender = (body.gender ?? null) as typeof user.gender
    await user.save()

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          birthday: user.birthday,
          gender: user.gender,
          authProvider: user.authProvider,
          isGuest: user.isGuest,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid body", details: error.flatten() } })
      return
    }
    console.error("PATCH /profile error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } })
  }
})

// ─── PATCH /profile/skin ────────────────────────────────────────────────────

const scaleSchema = z.number().int().min(1).max(5).optional().nullable()

const updateSkinSchema = z.object({
  skinType: z.enum(SKIN_TYPES as unknown as [string, ...string[]]).optional(),
  sensitivityLevel: z.enum(SENSITIVITY_LEVELS as unknown as [string, ...string[]]).optional(),
  fitzpatrickType: z.enum(FITZPATRICK_TYPES as unknown as [string, ...string[]]).optional().nullable(),
  acneProne: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
  climateType: z.enum(CLIMATE_TYPES as unknown as [string, ...string[]]).optional().nullable(),
  sunExposure: scaleSchema,
  pollutionExposure: scaleSchema,
  stressLevel: scaleSchema,
  sleepQuality: scaleSchema,
  hydrationLevel: scaleSchema,
  exerciseFrequency: z.enum(EXERCISE_FREQUENCIES as unknown as [string, ...string[]]).optional().nullable(),
  dietType: z.enum(DIET_TYPES as unknown as [string, ...string[]]).optional().nullable(),
  smokingStatus: z.enum(SMOKING_STATUSES as unknown as [string, ...string[]]).optional().nullable(),
  screenTime: scaleSchema,
})

profileRouter.patch("/skin", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const body = updateSkinSchema.parse(req.body)
    const { SkinProfile } = getModels()

    let profile = await SkinProfile.findOne({ where: { userId } })

    if (profile) {
      if (body.skinType !== undefined) profile.skinType = body.skinType as typeof profile.skinType
      if (body.sensitivityLevel !== undefined) profile.sensitivityLevel = body.sensitivityLevel as typeof profile.sensitivityLevel
      if (body.fitzpatrickType !== undefined) profile.fitzpatrickType = (body.fitzpatrickType ?? null) as typeof profile.fitzpatrickType
      if (body.acneProne !== undefined) profile.acneProne = body.acneProne
      if (body.notes !== undefined) profile.notes = body.notes
      if (body.climateType !== undefined) profile.climateType = (body.climateType ?? null) as typeof profile.climateType
      if (body.sunExposure !== undefined) profile.sunExposure = body.sunExposure ?? null
      if (body.pollutionExposure !== undefined) profile.pollutionExposure = body.pollutionExposure ?? null
      if (body.stressLevel !== undefined) profile.stressLevel = body.stressLevel ?? null
      if (body.sleepQuality !== undefined) profile.sleepQuality = body.sleepQuality ?? null
      if (body.hydrationLevel !== undefined) profile.hydrationLevel = body.hydrationLevel ?? null
      if (body.exerciseFrequency !== undefined) profile.exerciseFrequency = (body.exerciseFrequency ?? null) as typeof profile.exerciseFrequency
      if (body.dietType !== undefined) profile.dietType = (body.dietType ?? null) as typeof profile.dietType
      if (body.smokingStatus !== undefined) profile.smokingStatus = (body.smokingStatus ?? null) as typeof profile.smokingStatus
      if (body.screenTime !== undefined) profile.screenTime = body.screenTime ?? null
      await profile.save()
    } else {
      profile = await SkinProfile.create({
        userId,
        skinType: (body.skinType ?? null) as typeof SkinProfile.prototype.skinType,
        sensitivityLevel: (body.sensitivityLevel ?? null) as typeof SkinProfile.prototype.sensitivityLevel,
        fitzpatrickType: (body.fitzpatrickType ?? null) as typeof SkinProfile.prototype.fitzpatrickType,
        acneProne: body.acneProne ?? null,
        notes: body.notes ?? null,
        climateType: (body.climateType ?? null) as typeof SkinProfile.prototype.climateType,
        sunExposure: body.sunExposure ?? null,
        pollutionExposure: body.pollutionExposure ?? null,
        stressLevel: body.stressLevel ?? null,
        sleepQuality: body.sleepQuality ?? null,
        hydrationLevel: body.hydrationLevel ?? null,
        exerciseFrequency: (body.exerciseFrequency ?? null) as typeof SkinProfile.prototype.exerciseFrequency,
        dietType: (body.dietType ?? null) as typeof SkinProfile.prototype.dietType,
        smokingStatus: (body.smokingStatus ?? null) as typeof SkinProfile.prototype.smokingStatus,
        screenTime: body.screenTime ?? null,
      })
    }

    res.status(200).json({
      ok: true,
      data: {
        skinType: profile.skinType,
        sensitivityLevel: profile.sensitivityLevel,
        fitzpatrickType: profile.fitzpatrickType,
        acneProne: profile.acneProne,
        notes: profile.notes,
        climateType: profile.climateType,
        sunExposure: profile.sunExposure,
        pollutionExposure: profile.pollutionExposure,
        stressLevel: profile.stressLevel,
        sleepQuality: profile.sleepQuality,
        hydrationLevel: profile.hydrationLevel,
        exerciseFrequency: profile.exerciseFrequency,
        dietType: profile.dietType,
        smokingStatus: profile.smokingStatus,
        screenTime: profile.screenTime,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid body", details: error.flatten() } })
      return
    }
    console.error("PATCH /profile/skin error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update skin profile" } })
  }
})

// ─── PUT /profile/concerns ──────────────────────────────────────────────────

const updateConcernsSchema = z.object({
  concernIds: z.array(z.string().uuid()).max(20),
})

profileRouter.put("/concerns", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const body = updateConcernsSchema.parse(req.body)
    const { UserSkinConcern, SkinConcern } = getModels()

    // Remove existing
    await UserSkinConcern.destroy({ where: { userId } })

    // Add new
    if (body.concernIds.length > 0) {
      const validConcerns = await SkinConcern.findAll({
        where: { id: body.concernIds },
      })

      const validIds = new Set(validConcerns.map((c) => c.id))

      await UserSkinConcern.bulkCreate(
        body.concernIds
          .filter((id) => validIds.has(id))
          .map((concernId) => ({ userId, concernId })),
      )
    }

    res.status(200).json({ ok: true, data: { updated: true } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid body", details: error.flatten() } })
      return
    }
    console.error("PUT /profile/concerns error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update concerns" } })
  }
})

// ─── GET /profile/concerns/options ──────────────────────────────────────────

profileRouter.get("/concerns/options", async (_req, res) => {
  try {
    const { SkinConcern } = getModels()

    const concerns = await SkinConcern.findAll({
      order: [["name", "ASC"]],
    })

    res.status(200).json({
      ok: true,
      data: concerns.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
      })),
    })
  } catch (error) {
    console.error("GET /profile/concerns/options error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load concerns" } })
  }
})

// ─── PUT /profile/allergens ────────────────────────────────────────────────

const updateAllergensSchema = z.object({
  allergenIds: z.array(z.string().uuid()).max(30),
})

profileRouter.put("/allergens", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const body = updateAllergensSchema.parse(req.body)
    const { UserAllergen, Allergen } = getModels()

    await UserAllergen.destroy({ where: { userId } })

    if (body.allergenIds.length > 0) {
      const valid = await Allergen.findAll({ where: { id: body.allergenIds } })
      const validIds = new Set(valid.map((a) => a.id))
      await UserAllergen.bulkCreate(
        body.allergenIds
          .filter((id) => validIds.has(id))
          .map((allergenId) => ({ userId, allergenId })),
      )
    }

    res.status(200).json({ ok: true, data: { updated: true } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid body", details: error.flatten() } })
      return
    }
    console.error("PUT /profile/allergens error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update allergens" } })
  }
})

// ─── GET /profile/allergens/options ────────────────────────────────────────

profileRouter.get("/allergens/options", async (_req, res) => {
  try {
    const { Allergen } = getModels()
    const allergens = await Allergen.findAll({ order: [["category", "ASC"], ["name", "ASC"]] })

    res.status(200).json({
      ok: true,
      data: allergens.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        category: a.category,
      })),
    })
  } catch (error) {
    console.error("GET /profile/allergens/options error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load allergens" } })
  }
})

// ─── PUT /profile/preferences ──────────────────────────────────────────────

const updatePreferencesSchema = z.object({
  preferenceIds: z.array(z.string().uuid()).max(30),
})

profileRouter.put("/preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const body = updatePreferencesSchema.parse(req.body)
    const { UserProductPreference, ProductPreference } = getModels()

    await UserProductPreference.destroy({ where: { userId } })

    if (body.preferenceIds.length > 0) {
      const valid = await ProductPreference.findAll({ where: { id: body.preferenceIds } })
      const validIds = new Set(valid.map((p) => p.id))
      await UserProductPreference.bulkCreate(
        body.preferenceIds
          .filter((id) => validIds.has(id))
          .map((preferenceId) => ({ userId, preferenceId })),
      )
    }

    res.status(200).json({ ok: true, data: { updated: true } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid body", details: error.flatten() } })
      return
    }
    console.error("PUT /profile/preferences error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update preferences" } })
  }
})

// ─── GET /profile/preferences/options ──────────────────────────────────────

profileRouter.get("/preferences/options", async (_req, res) => {
  try {
    const { ProductPreference } = getModels()
    const preferences = await ProductPreference.findAll({ order: [["category", "ASC"], ["name", "ASC"]] })

    res.status(200).json({
      ok: true,
      data: preferences.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
      })),
    })
  } catch (error) {
    console.error("GET /profile/preferences/options error:", error)
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load preferences" } })
  }
})

export { profileRouter }
