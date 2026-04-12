import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { getModels } from "../models/index.js"
import { SKIN_TYPES, SENSITIVITY_LEVELS } from "../models/db-types.js"

const profileRouter = Router()

// ─── GET /profile ───────────────────────────────────────────────────────────

profileRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const { User, AuthIdentity, SkinProfile, SkinConcern, UserSkinConcern } = getModels()

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

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
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
              acneProne: skinProfile.acneProne,
              notes: skinProfile.notes,
            }
          : null,
        skinConcerns: userConcerns.map((uc) => ({
          id: (uc as unknown as { concern: { id: string; slug: string; name: string } }).concern.id,
          slug: (uc as unknown as { concern: { slug: string } }).concern.slug,
          name: (uc as unknown as { concern: { name: string } }).concern.name,
          severity: uc.severity,
        })),
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
    await user.save()

    res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
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

const updateSkinSchema = z.object({
  skinType: z.enum(SKIN_TYPES as unknown as [string, ...string[]]).optional(),
  sensitivityLevel: z.enum(SENSITIVITY_LEVELS as unknown as [string, ...string[]]).optional(),
  acneProne: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
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
      if (body.acneProne !== undefined) profile.acneProne = body.acneProne
      if (body.notes !== undefined) profile.notes = body.notes
      await profile.save()
    } else {
      profile = await SkinProfile.create({
        userId,
        skinType: (body.skinType ?? null) as typeof SkinProfile.prototype.skinType,
        sensitivityLevel: (body.sensitivityLevel ?? null) as typeof SkinProfile.prototype.sensitivityLevel,
        acneProne: body.acneProne ?? null,
        notes: body.notes ?? null,
      })
    }

    res.status(200).json({
      ok: true,
      data: {
        skinType: profile.skinType,
        sensitivityLevel: profile.sensitivityLevel,
        acneProne: profile.acneProne,
        notes: profile.notes,
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

export { profileRouter }
