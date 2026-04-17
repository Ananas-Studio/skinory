import { Router, type Request, type Response } from 'express'
import { z, ZodError } from 'zod'
import multer from 'multer'
import { parseIngredientString } from '@skinory/core'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { checkUsage, recordUsageFromReq } from '../middlewares/usage.middleware.js'
import { concurrencyGuard } from '../middlewares/concurrency.middleware.js'
import { strictLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  evaluateProduct,
  EvaluationServiceError,
} from '../services/evaluation.service.js'
import {
  resolveProduct,
  ProductLookupError,
  slugify,
  inferCategoryFromText,
} from '../services/product-lookup.service.js'
import {
  recognizeProductFromImage,
  ImageRecognitionError,
} from '../services/image-recognition.service.js'
import { createOcrProvider } from '../services/ocr/index.js'
import { sequelize } from '../config/database.js'
import { Op } from 'sequelize'
import { getModels } from '../models/index.js'

export const scanRouter = Router()

scanRouter.use(requireAuth)

// ─── Multer config (memory storage, images only, 10 MB limit) ───────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'))
    }
  },
})

// ─── POST /scan/evaluate ─────────────────────────────────────────────────────

const evaluateSchema = z.object({
  productId: z.string().uuid(),
})

scanRouter.post('/evaluate', strictLimiter, checkUsage('ai_evaluation'), async (req: Request, res: Response) => {
  try {
    const body = evaluateSchema.parse(req.body)
    const userId = (req as any).authUserId as string

    const result = await evaluateProduct(userId, body.productId)

    await recordUsageFromReq(req)
    res.json({ ok: true, data: result })
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.issues },
      })
      return
    }
    if (err instanceof EvaluationServiceError) {
      res.status(err.status).json({
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      })
      return
    }
    console.error('[scan/evaluate] Unexpected error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    })
  }
})

// ─── GET /scan/history ───────────────────────────────────────────────────────

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

scanRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).authUserId as string
    const { limit, offset } = historyQuerySchema.parse(req.query)
    const models = getModels()

    const { rows: scans, count: total } = await models.Scan.findAndCountAll({
      where: {
        userId,
        resultStatus: 'success',
        [Op.or]: [
          { barcodeValue: { [Op.ne]: null } },
          { productId: { [Op.ne]: null } },
        ],
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    // Batch-lookup products by barcode
    const barcodes = scans
      .map((s: any) => s.barcodeValue)
      .filter(Boolean) as string[]

    const barcodeRecords = barcodes.length > 0
      ? await models.ProductBarcode.findAll({
          where: { barcode: barcodes },
          include: [
            {
              model: models.Product,
              as: 'product',
              include: [{ model: models.Brand, as: 'brand' }],
            },
          ],
        })
      : []

    const productByBarcode = new Map<string, any>()
    for (const rec of barcodeRecords) {
      const r = rec as any
      if (r.product) {
        productByBarcode.set(r.barcode, {
          id: r.product.id,
          name: r.product.name,
          brandName: r.product.brand?.name ?? null,
          category: r.product.category,
          imageUrl: r.product.imageUrl,
        })
      }
    }

    // Batch-lookup products by productId (for URL-type scans)
    const directProductIds = scans
      .map((s: any) => s.productId)
      .filter(Boolean) as string[]

    const directProducts = directProductIds.length > 0
      ? await models.Product.findAll({
          where: { id: directProductIds },
          include: [{ model: models.Brand, as: 'brand' }],
        })
      : []

    const productById = new Map<string, any>()
    for (const p of directProducts) {
      const r = p as any
      productById.set(r.id, {
        id: r.id,
        name: r.name,
        brandName: r.brand?.name ?? null,
        category: r.category,
        imageUrl: r.imageUrl,
      })
    }

    const data = scans.map((s: any) => {
      // Prefer direct productId, fallback to barcode lookup
      const product = s.productId
        ? (productById.get(s.productId) ?? null)
        : s.barcodeValue
          ? (productByBarcode.get(s.barcodeValue) ?? null)
          : null

      return {
        id: s.id,
        barcodeValue: s.barcodeValue,
        scanType: s.scanType,
        resultStatus: s.resultStatus,
        createdAt: s.createdAt,
        product,
      }
    })

    res.json({ ok: true, data: { scans: data, total, limit, offset } })
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: err.issues },
      })
      return
    }
    console.error('[scan/history] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch scan history' },
    })
  }
})

// ─── GET /scan/products ──────────────────────────────────────────────────────
// Lists available products for evaluation (temporary helper until barcode lookup is built)

scanRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const models = getModels()

    const products = await models.Product.findAll({
      where: { isActive: true },
      include: [{ model: models.Brand, as: 'brand' }],
      order: [['name', 'ASC']],
      limit: 50,
    })

    const data = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      brandName: p.brand?.name ?? null,
      category: p.category,
      imageUrl: p.imageUrl,
    }))

    res.json({ ok: true, data })
  } catch (err: any) {
    console.error('[scan/products] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
    })
  }
})

// ─── POST /scan/resolve ──────────────────────────────────────────────────────

const resolveSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
  barcodeFormat: z.string().optional(),
})

scanRouter.post('/resolve', checkUsage('scan_resolve'), async (req: Request, res: Response) => {
  try {
    const body = resolveSchema.parse(req.body)
    const userId = req.authUserId as string

    const result = await resolveProduct(body.barcode, userId)
    
    await recordUsageFromReq(req)
    res.json({ ok: true, data: result })
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.issues },
      })
      return
    }
    if (err instanceof ProductLookupError) {
      res.status(err.status).json({
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      })
      return
    }
    console.error('[scan/resolve] Unexpected error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    })
  }
})

// ─── POST /scan/ocr-ingredients ─────────────────────────────────────────────

scanRouter.post('/ocr-ingredients', strictLimiter, checkUsage('scan_ocr'), concurrencyGuard(), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({
        ok: false,
        error: { code: 'MISSING_IMAGE', message: 'An image file is required (field: "image")' },
      })
      return
    }

    const ocrProvider = createOcrProvider()
    const ocrResult = await ocrProvider.recognize(file.buffer)

    const parsed = parseIngredientString(ocrResult.text)

    res.json({
      ok: true,
      data: {
        ocrText: ocrResult.text,
        confidence: ocrResult.confidence,
        ingredients: parsed.ingredients,
      },
    })
  } catch (err: any) {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be under 10 MB'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Only image files are accepted'
          : err.message
      res.status(400).json({
        ok: false,
        error: { code: 'UPLOAD_ERROR', message },
      })
      return
    }
    console.error('[scan/ocr-ingredients] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process image' },
    })
  }
})

// ─── POST /scan/save-ingredients ─────────────────────────────────────────────

const saveIngredientsSchema = z.object({
  productId: z.string().uuid(),
  ingredientsText: z.string().trim().min(1, 'Ingredients text is required'),
})

scanRouter.post('/save-ingredients', async (req: Request, res: Response) => {
  try {
    const body = saveIngredientsSchema.parse(req.body)
    const { Product, Ingredient, ProductIngredient } = getModels()

    const product = await Product.findByPk(body.productId)
    if (!product) {
      res.status(404).json({
        ok: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      })
      return
    }

    const parsed = parseIngredientString(body.ingredientsText)
    const ingredientNames: string[] = []

    await sequelize.transaction(async (transaction) => {
      for (const item of parsed.ingredients) {
        const [ingredient] = await Ingredient.findOrCreate({
          where: { inciName: item.inciName },
          defaults: { inciName: item.inciName, displayName: item.rawLabel },
          transaction,
        })

        await ProductIngredient.findOrCreate({
          where: { productId: body.productId, ingredientId: ingredient.id },
          defaults: {
            productId: body.productId,
            ingredientId: ingredient.id,
            ingredientOrder: item.order,
            rawLabel: item.rawLabel,
          },
          transaction,
        })

        ingredientNames.push(item.inciName)
      }
    })

    res.json({
      ok: true,
      data: {
        success: true,
        ingredientCount: ingredientNames.length,
        ingredients: ingredientNames,
      },
    })
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.issues },
      })
      return
    }
    console.error('[scan/save-ingredients] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save ingredients' },
    })
  }
})

// ─── POST /scan/create-product ──────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  brand: z.string().trim().optional(),
  attributes: z.array(z.string()).optional(),
})

scanRouter.post('/create-product', async (req: Request, res: Response) => {
  try {
    const body = createProductSchema.parse(req.body)
    const { Product, Brand } = getModels()

    let brandId: string | null = null
    if (body.brand) {
      const brandSlug = slugify(body.brand)
      if (brandSlug) {
        const [brand] = await Brand.findOrCreate({
          where: { slug: brandSlug },
          defaults: { name: body.brand, slug: brandSlug },
        })
        brandId = (brand as any).id
      }
    }

    const productSlug = slugify(body.name) || `product-${Date.now()}`
    const category = inferCategoryFromText(body.name, body.brand ?? null)

    const product = await Product.create({
      name: body.name,
      brandId,
      slug: productSlug,
      category,
      sourceType: 'manual_import',
      sourceConfidence: '0.6000',
    })

    const p = product as any
    res.json({
      ok: true,
      data: {
        id: p.id,
        name: p.name,
        brandName: body.brand ?? null,
        category: p.category,
      },
    })
  } catch (err: any) {
    if (err instanceof ZodError) {
      const zodErr = err as ZodError
      res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: zodErr.issues[0]?.message ?? 'Invalid input', details: zodErr.issues },
      })
      return
    }
    console.error('[scan/create-product] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create product' },
    })
  }
})

// ─── POST /scan/recognize-image ─────────────────────────────────────────────

scanRouter.post('/recognize-image', strictLimiter, checkUsage('scan_image_recognize'), concurrencyGuard(), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({
        ok: false,
        error: { code: 'MISSING_IMAGE', message: 'An image file is required (field: "image")' },
      })
      return
    }

    const userId = req.authUserId as string
    const result = await recognizeProductFromImage(file.buffer, userId)

    res.json({ ok: true, data: result })
  } catch (err: any) {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be under 10 MB'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Only image files are accepted'
          : err.message
      res.status(400).json({
        ok: false,
        error: { code: 'UPLOAD_ERROR', message },
      })
      return
    }
    if (err instanceof ImageRecognitionError) {
      res.status(err.status).json({
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      })
      return
    }
    console.error('[scan/recognize-image] Error:', err)
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to recognize product from image' },
    })
  }
})
