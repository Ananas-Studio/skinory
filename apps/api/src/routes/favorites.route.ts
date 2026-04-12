import { Router } from "express"
import { z, ZodError } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { getModels } from "../models/index.js"

const favoritesRouter = Router()

// ─── POST /favorites ─────────────────────────────────────────────────────────

const addSchema = z.object({
  productId: z.string().uuid(),
})

favoritesRouter.post("/", requireAuth, async (req, res) => {
  try {
    const { productId } = addSchema.parse(req.body)
    const userId = req.authUserId as string
    const { Favorite, Product } = getModels()

    const product = await Product.findByPk(productId)
    if (!product) {
      res.status(404).json({
        ok: false,
        error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
      })
      return
    }

    const [fav, created] = await Favorite.findOrCreate({
      where: { userId, productId },
      defaults: { userId, productId },
    })

    res.status(created ? 201 : 200).json({
      ok: true,
      data: { id: fav.id, productId, added: created },
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_FAILED", message: "Invalid request", details: error.flatten() },
      })
      return
    }
    console.error("POST /favorites error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to add favorite" },
    })
  }
})

// ─── DELETE /favorites/:productId ────────────────────────────────────────────

favoritesRouter.delete("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const productId = req.params.productId as string
    const { Favorite } = getModels()

    const deleted = await Favorite.destroy({ where: { userId, productId } })

    res.status(200).json({
      ok: true,
      data: { productId, removed: deleted > 0 },
    })
  } catch (error: unknown) {
    console.error("DELETE /favorites error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to remove favorite" },
    })
  }
})

// ─── GET /favorites ──────────────────────────────────────────────────────────

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

favoritesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const { limit, offset } = listSchema.parse(req.query)
    const { Favorite, Product, Brand } = getModels()

    const { rows, count } = await Favorite.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "imageUrl", "category"],
          include: [
            {
              model: Brand,
              as: "brand",
              attributes: ["name"],
            },
          ],
        },
      ],
    })

    const favorites = rows.map((fav) => {
      const p = (fav as any).product
      return {
        id: fav.id,
        productId: fav.productId,
        createdAt: fav.createdAt,
        product: p
          ? {
              id: p.id,
              name: p.name,
              imageUrl: p.imageUrl,
              category: p.category,
              brandName: p.brand?.name ?? null,
            }
          : null,
      }
    })

    res.status(200).json({
      ok: true,
      data: { favorites, total: count, limit, offset },
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_FAILED", message: "Invalid query params", details: error.flatten() },
      })
      return
    }
    console.error("GET /favorites error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to list favorites" },
    })
  }
})

// ─── GET /favorites/ids ──────────────────────────────────────────────────────
// Lightweight endpoint: returns only product IDs the user has favorited.

favoritesRouter.get("/ids", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const { Favorite } = getModels()

    const rows = await Favorite.findAll({
      where: { userId },
      attributes: ["productId"],
      raw: true,
    })

    const productIds = rows.map((r) => r.productId)

    res.status(200).json({ ok: true, data: { productIds } })
  } catch (error: unknown) {
    console.error("GET /favorites/ids error:", error)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch favorite IDs" },
    })
  }
})

export { favoritesRouter }
