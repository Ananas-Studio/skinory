import { Request, Response, Router } from "express"
import { z } from "zod"
import { getModels } from "../models/index.js"
import { requireAuth } from "../middlewares/auth.middleware.js"
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

// ─── GET /products/:id ──────────────────────────────────────────────────────

productsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const {
      Product, Brand, ProductBarcode, ProductIngredient,
      Ingredient, ProductSource,
    } = getModels()

    const product = await Product.findByPk(id, {
      include: [
        { model: Brand, as: "brand" },
        { model: ProductBarcode, as: "barcodes" },
        {
          model: ProductIngredient,
          as: "productIngredients",
          include: [{ model: Ingredient, as: "ingredient" }],
          separate: true,
        },
        { model: ProductSource, as: "sources" },
      ],
    })

    if (!product) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Product not found" },
      })
      return
    }

    const p = product as any

    const ingredients = (p.productIngredients ?? [])
      .sort((a: any, b: any) => (a.ingredientOrder ?? 999) - (b.ingredientOrder ?? 999))
      .map((pi: any) => ({
        id: pi.ingredient?.id ?? pi.ingredientId,
        inciName: pi.ingredient?.inciName ?? null,
        displayName: pi.ingredient?.displayName ?? null,
        description: pi.ingredient?.description ?? null,
        comedogenicRating: pi.ingredient?.comedogenicRating ?? null,
        isPotentialAllergen: pi.ingredient?.isPotentialAllergen ?? false,
        isActiveIngredient: pi.ingredient?.isActiveIngredient ?? false,
        order: pi.ingredientOrder,
        rawLabel: pi.rawLabel,
        concentrationText: pi.concentrationText,
      }))

    const barcodes = (p.barcodes ?? []).map((b: any) => ({
      barcode: b.barcode,
      format: b.barcodeFormat,
      isPrimary: b.isPrimary,
    }))

    // Extract extra OBF fields from raw payload if available
    const obfSource = (p.sources ?? []).find(
      (s: any) => s.sourceKind === "barcode_lookup" && s.rawPayload
    )
    const obfExtras: Record<string, unknown> = {}
    if (obfSource?.rawPayload) {
      const raw = obfSource.rawPayload as Record<string, unknown>
      if (raw.categories) obfExtras.categories = raw.categories
      if (raw.labels) obfExtras.labels = raw.labels
      if (raw.packaging) obfExtras.packaging = raw.packaging
      if (raw.quantity) obfExtras.quantity = raw.quantity
      if (raw.countries) obfExtras.countries = raw.countries
      if (raw.manufacturing_places) obfExtras.manufacturingPlaces = raw.manufacturing_places
      if (raw.origins) obfExtras.origins = raw.origins
    }

    const sources = (p.sources ?? []).map((s: any) => ({
      id: s.id,
      sourceKind: s.sourceKind,
      sourceUrl: s.sourceUrl,
      scrapeStatus: s.scrapeStatus,
      createdAt: s.createdAt,
    }))

    res.json({
      ok: true,
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        subcategory: p.subcategory,
        productForm: p.productForm,
        description: p.description,
        imageUrl: p.imageUrl,
        sourceType: p.sourceType,
        sourceConfidence: p.sourceConfidence ? Number(p.sourceConfidence) : null,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        brand: p.brand ? { id: p.brand.id, name: p.brand.name, logoUrl: p.brand.logoUrl } : null,
        barcodes,
        ingredients,
        sources,
        obfExtras,
      },
    })
  } catch (err: any) {
    console.error("[products] Detail error:", err)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch product detail" },
    })
  }
})

// ─── PATCH /products/:id ────────────────────────────────────────────────────

const updateProductSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  subcategory: z.string().min(1).max(100).optional(),
  productForm: z.string().min(1).max(100).optional(),
})

productsRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const body = updateProductSchema.parse(req.body)
    const { Product } = getModels()

    const product = await Product.findByPk(id)
    if (!product) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Product not found" },
      })
      return
    }

    // Only fill empty/null fields — don't overwrite existing data
    const updates: Record<string, string> = {}
    if (body.description && !product.description) updates.description = body.description
    if (body.subcategory && !product.subcategory) updates.subcategory = body.subcategory
    if (body.productForm && !product.productForm) updates.productForm = body.productForm

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        ok: false,
        error: { code: "NO_UPDATES", message: "All specified fields already have values" },
      })
      return
    }

    await product.update(updates)

    res.json({
      ok: true,
      data: {
        id: product.id,
        description: product.description,
        subcategory: product.subcategory,
        productForm: product.productForm,
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid update data",
          details: err.flatten(),
        },
      })
      return
    }

    console.error("[products] Update error:", err)
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update product" },
    })
  }
})

export { productsRouter }
