import { Transaction } from "sequelize";
import { parseIngredientString } from "@skinory/core";
import { sequelize } from "../config/database.js";
import { getModels } from "../models/index.js";
import { fetchObfProduct, type ObfProduct } from "./obf-client.js";

// ─── Public types ────────────────────────────────────────────────────────────

export interface LookupResult {
  product: {
    id: string;
    barcode: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    source: "internal" | "open_beauty_facts" | "not_found";
    ingredientsText: string | null;
    ingredients: string[];
  };
  capture: {
    method: "barcode";
    confidence: number | null;
  };
  isNew: boolean;
  needsIngredients: boolean;
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ProductLookupError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProductLookupError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function detectBarcodeFormat(barcode: string): "EAN13" | "UPC" | "OTHER" {
  const digits = barcode.replace(/\D/g, "");
  if (digits.length === 13) return "EAN13";
  if (digits.length === 12) return "UPC";
  return "OTHER";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Internal DB lookup ──────────────────────────────────────────────────────

async function lookupInternal(barcode: string): Promise<LookupResult | null> {
  const { ProductBarcode, Product, Brand, ProductIngredient, Ingredient } = getModels();

  const record = await ProductBarcode.findOne({
    where: { barcode },
    include: [
      {
        model: Product,
        as: "product",
        include: [
          { model: Brand, as: "brand" },
          {
            model: ProductIngredient,
            as: "productIngredients",
            include: [{ model: Ingredient, as: "ingredient" }],
          },
        ],
      },
    ],
  });

  if (!record) return null;

  const product = (record as any).product;
  if (!product) return null;

  const brand = product.brand;
  const productIngredients: any[] = product.productIngredients ?? [];

  const ingredientNames = productIngredients
    .sort((a: any, b: any) => (a.ingredientOrder ?? 0) - (b.ingredientOrder ?? 0))
    .map((pi: any) => pi.ingredient?.inciName)
    .filter(Boolean) as string[];

  const ingredientsText = ingredientNames.length > 0 ? ingredientNames.join(", ") : null;

  return {
    product: {
      id: product.id,
      barcode,
      name: product.name ?? null,
      brand: brand?.name ?? null,
      imageUrl: product.imageUrl ?? null,
      source: "internal",
      ingredientsText,
      ingredients: ingredientNames,
    },
    capture: { method: "barcode", confidence: null },
    isNew: false,
    needsIngredients: ingredientNames.length === 0,
  };
}

// ─── DB enrichment ───────────────────────────────────────────────────────────

interface PersistResult {
  productId: string;
  ingredientNames: string[];
  ingredientsText: string | null;
  brandName: string | null;
}

async function persistExternalProduct(
  barcode: string,
  obfProduct: ObfProduct,
  userId: string,
): Promise<PersistResult> {
  const { Brand, Product, ProductBarcode, ProductSource, Ingredient, ProductIngredient, Scan } =
    getModels();

  const obfUrl = `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}`;
  const productName = obfProduct.product_name?.trim() || `Unknown Product (${barcode})`;
  const brandName = obfProduct.brands?.split(",")[0]?.trim() || null;
  const imageUrl = obfProduct.image_url?.trim() || null;
  const rawIngredientsText = obfProduct.ingredients_text?.trim() || null;
  const category = extractCategory(obfProduct.categories, obfProduct.categories_tags);

  return sequelize.transaction(async (transaction: Transaction) => {
    // 1. Brand
    let brandId: string | null = null;
    if (brandName) {
      const brandSlug = slugify(brandName);
      if (brandSlug) {
        const [brand] = await Brand.findOrCreate({
          where: { slug: brandSlug },
          defaults: { name: brandName, slug: brandSlug },
          transaction,
        });
        brandId = brand.id;
      }
    }

    // 2. Product
    const productSlug = slugify(productName) || `product-${barcode}`;
    const product = await Product.create(
      {
        name: productName,
        brandId,
        slug: productSlug,
        category,
        imageUrl,
        sourceType: "barcode",
        sourceConfidence: "0.8000",
      },
      { transaction },
    );

    // 3. ProductBarcode
    await ProductBarcode.create(
      {
        productId: product.id,
        barcode,
        barcodeFormat: detectBarcodeFormat(barcode),
        isPrimary: true,
      },
      { transaction },
    );

    // 4. ProductSource
    await ProductSource.create(
      {
        productId: product.id,
        sourceKind: "barcode_lookup",
        sourceUrl: obfUrl,
        rawPayload: obfProduct as unknown as Record<string, unknown>,
        scrapeStatus: "success",
      },
      { transaction },
    );

    // 5. Ingredients
    let ingredientNames: string[] = [];
    if (rawIngredientsText) {
      const parsed = parseIngredientString(rawIngredientsText);
      for (const item of parsed.ingredients) {
        const [ingredient] = await Ingredient.findOrCreate({
          where: { inciName: item.inciName },
          defaults: { inciName: item.inciName, displayName: item.rawLabel },
          transaction,
        });

        await ProductIngredient.create(
          {
            productId: product.id,
            ingredientId: ingredient.id,
            ingredientOrder: item.order,
            rawLabel: item.rawLabel,
          },
          { transaction },
        );
      }
      ingredientNames = parsed.ingredients.map((i) => i.inciName);
    }

    // 6. Scan record
    await Scan.create(
      {
        userId,
        barcodeValue: barcode,
        scanType: "barcode",
        resultStatus: "success",
      },
      { transaction },
    );

    return {
      productId: product.id,
      ingredientNames,
      ingredientsText: rawIngredientsText,
      brandName,
    };
  });
}

// ─── Skincare keyword sets (OBF uses these in categories & categories_tags) ──

const SKINCARE_KEYWORDS = [
  "skincare", "skin care", "skin-care",
  // face
  "face", "facial", "visage",
  // product types
  "moisturizer", "moisturiser", "cleanser", "serum", "toner",
  "exfoliant", "exfoliator", "scrub", "peel",
  "mask", "eye cream", "eye care",
  "lotion", "cream", "balm", "oil", "gel", "essence", "ampoule", "emulsion",
  // concerns
  "anti-aging", "anti-wrinkle", "acne", "blemish", "hydrating", "brightening",
  // sun
  "sunscreen", "suncare", "sun-care", "sun protection", "spf",
  "facial-sunscreen", "in-sun-protection",
  // body
  "body care", "body-care", "body lotion", "body cream", "hand cream",
  // cleansing
  "micellar", "cleansing", "make-up remover", "makeup remover",
  // beauty generic (OBF tags)
  "beauty", "beauty-products", "non-food-products",
  // hair (still skincare-adjacent in OBF context)
  "shampoo", "conditioner", "hair care", "hair-care",
  // lips
  "lip care", "lip balm", "lip-care",
]

const MAKEUP_KEYWORDS = [
  "makeup", "make-up", "cosmetic",
  "foundation", "lipstick", "mascara", "eyeliner", "eyeshadow",
  "blush", "concealer", "primer", "contour", "highlighter",
  "nail polish", "nail-polish",
]

const SUPPLEMENT_KEYWORDS = [
  "supplement", "vitamin", "dietary",
  "nutraceutical", "collagen supplement",
]

function extractCategory(
  categories: string | undefined,
  categoriesTags: string[] | undefined,
): "skincare" | "makeup" | "supplement" | "other" {
  // Merge free-text categories + normalized tags into one searchable string
  const parts: string[] = []
  if (categories) parts.push(categories.toLowerCase())
  if (categoriesTags?.length) parts.push(categoriesTags.join(" ").toLowerCase())
  if (parts.length === 0) return "other"

  const haystack = parts.join(" ")

  // Check supplement first (narrow) to avoid false positives with "vitamin" in skincare
  if (SUPPLEMENT_KEYWORDS.some((kw) => haystack.includes(kw))) {
    // If it also matches skincare strongly, prefer skincare
    if (!SKINCARE_KEYWORDS.some((kw) => haystack.includes(kw))) return "supplement"
  }
  if (SKINCARE_KEYWORDS.some((kw) => haystack.includes(kw))) return "skincare"
  if (MAKEUP_KEYWORDS.some((kw) => haystack.includes(kw))) return "makeup"
  if (SUPPLEMENT_KEYWORDS.some((kw) => haystack.includes(kw))) return "supplement"
  return "other"
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function resolveProduct(barcode: string, userId: string): Promise<LookupResult> {
  if (!barcode || typeof barcode !== "string") {
    throw new ProductLookupError("INVALID_BARCODE", "Barcode is required", 400);
  }

  const sanitized = barcode.trim();

  // Step 1: Check internal DB
  const internal = await lookupInternal(sanitized);
  if (internal) return internal;

  // Step 2: Query Open Beauty Facts via SDK
  const obfResult = await fetchObfProduct(sanitized);
  if (obfResult.found && obfResult.product) {
    try {
      const persisted = await persistExternalProduct(sanitized, obfResult.product, userId);

      return {
        product: {
          id: persisted.productId,
          barcode: sanitized,
          name: obfResult.product.product_name?.trim() || null,
          brand: persisted.brandName,
          imageUrl: obfResult.product.image_url?.trim() || null,
          source: "open_beauty_facts",
          ingredientsText: persisted.ingredientsText,
          ingredients: persisted.ingredientNames,
        },
        capture: { method: "barcode", confidence: 0.8 },
        isNew: true,
        needsIngredients: persisted.ingredientNames.length === 0,
      };
    } catch (err) {
      throw new ProductLookupError(
        "ENRICHMENT_FAILED",
        "Found product externally but failed to persist to database",
        500,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Step 3: Not found
  return {
    product: {
      id: "",
      barcode: sanitized,
      name: null,
      brand: null,
      imageUrl: null,
      source: "not_found",
      ingredientsText: null,
      ingredients: [],
    },
    capture: { method: "barcode", confidence: null },
    isNew: false,
    needsIngredients: true,
  };
}
