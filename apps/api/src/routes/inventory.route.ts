import { Response, Router } from "express"
import { ZodError, z } from "zod"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  addItem,
  listItems,
  removeItem,
  toPublicError,
} from "../services/inventory.service.js"

const inventoryRouter = Router()

const addItemSchema = z.object({
  productId: z.string().uuid(),
  source: z.enum(["scan", "url", "manual"]).default("scan"),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

function respondInventoryError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "INVENTORY_VALIDATION_FAILED",
        message: "Invalid request body",
        details: error.flatten(),
      },
    })
    return
  }

  const publicError = toPublicError(error)
  res.status(publicError.status).json({
    ok: false,
    error: {
      code: publicError.code,
      message: publicError.message,
      details: publicError.details,
    },
  })
}

// ─── POST /inventory/items ───────────────────────────────────────────────────

inventoryRouter.post("/items", requireAuth, async (req, res) => {
  try {
    const body = addItemSchema.parse(req.body)
    const userId = req.authUserId as string

    const result = await addItem(userId, body.productId, body.source)

    res.status(result.alreadyExisted ? 200 : 201).json({
      ok: true,
      data: result,
    })
  } catch (error: unknown) {
    respondInventoryError(res, error)
  }
})

// ─── GET /inventory/items ────────────────────────────────────────────────────

inventoryRouter.get("/items", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const { limit, offset } = listQuerySchema.parse(req.query)
    const { items, total } = await listItems(userId, limit, offset)

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, limit, offset },
    })
  } catch (error: unknown) {
    respondInventoryError(res, error)
  }
})

// ─── DELETE /inventory/items/:itemId ─────────────────────────────────────────

inventoryRouter.delete("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId as string
    const itemId = req.params.itemId as string

    await removeItem(userId, itemId)

    res.status(200).json({ ok: true, data: null })
  } catch (error: unknown) {
    respondInventoryError(res, error)
  }
})

export { inventoryRouter }
