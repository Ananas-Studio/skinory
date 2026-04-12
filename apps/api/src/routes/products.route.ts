import { Request, Response, Router } from "express"
import { z } from "zod"
import { getModels } from "../models/index.js"
import { Op } from "sequelize"

const productsRouter = Router()

// ─── GET /products ───────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
})

productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const query = listQuerySchema.parse(req.query)
    const { Product, Brand } = getModels()

    const where: Record<string, unknown> = { isActive: true }

    if (query.category) {
      where.category = query.category
    }

    if (query.search) {
      where.name = { [Op.iLike]: `%${query.search}%` }
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [{ model: Brand, as: "brand" }],
      order: [["createdAt", "DESC"]],
      limit: query.limit,
      offset: query.offset,
    })

    const items = rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      brandName: p.brand?.name ?? null,
      category: p.category,
      imageUrl: p.imageUrl,
    }))

    res.json({
      ok: true,
      data: {
        items,
        total: count,
        limit: query.limit,
        offset: query.offset,
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid query parameters",
          details: err.flatten(),
        },
      })
      return
    }

    console.error("[products] Error:", err)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch products" },
    })
  }
})

export { productsRouter }
