import { Transaction } from "sequelize";
import { parseIngredientString } from "@skinory/core";
import { sequelize } from "../config/database.js";
import { getModels } from "../models/index.js";
import { fetchObfProduct, type ObfProduct } from "./obf-client.js";
import { downloadImage } from "./image-proxy.service.js";
import {
  uploadProductImage,
  isAzureStorageConfigured,
  ensureContainer,
} from "./azure-blob.service.js";

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

/** Build the best available product name from OBF data. */
function resolveProductName(obf: ObfProduct, barcode: string): string {
  // 1. Explicit product name
  const name = obf.product_name?.trim();
  if (name) return name;

  // 2. Alternative OBF name fields
  const generic = obf.generic_name?.trim();
  if (generic) return generic;

  const abbreviated = obf.abbreviated_product_name?.trim();
  if (abbreviated) return abbreviated;

  // 3. Brand name as fallback (e.g. "Unilever")
  const brand = obf.brands?.split(",")[0]?.trim();
  if (brand) return brand;

  // 4. Last resort
  return `Unknown Product (${barcode})`;
}

export function detectBarcodeFormat(barcode: string): "EAN13" | "UPC" | "OTHER" {
  const digits = barcode.replace(/\D/g, "");
  if (digits.length === 13) return "EAN13";
  if (digits.length === 12) return "UPC";
  return "OTHER";
}

// Transliterate accented / non-ASCII Latin characters to ASCII equivalents.
// Covers Turkish (ğüşıöç İ), common European diacritics, and Nordic letters.
const CHAR_MAP: Record<string, string> = {
  ğ: "g", ü: "u", ş: "s", ı: "i", ö: "o", ç: "c",
  Ğ: "g", Ü: "u", Ş: "s", İ: "i", Ö: "o", Ç: "c",
  â: "a", ê: "e", î: "i", ô: "o", û: "u",
  á: "a", é: "e", í: "i", ó: "o", ú: "u",
  à: "a", è: "e", ì: "i", ò: "o", ù: "u",
  ä: "a", ë: "e", ï: "i", ñ: "n", ý: "y",
  å: "a", æ: "ae", ø: "o", ß: "ss",
}

export function transliterate(text: string): string {
  return text.replace(/[^\u0000-\u007F]/g, (ch) => CHAR_MAP[ch] ?? "")
}

export function slugify(name: string): string {
  return transliterate(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
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
  const productName = resolveProductName(obfProduct, barcode);
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

export const SKINCARE_KEYWORDS = [
  "skincare", "skin care", "skin-care",
  // face
  "face", "facial", "visage",
  // product types
  "moisturizer", "moisturiser", "cleanser", "serum", "toner",
  "exfoliant", "exfoliator", "scrub", "peel",
  "mask", "eye cream", "eye care",
  "lotion", "cream", "balm", "oil", "gel", "essence", "ampoule", "emulsion",
  "retinol", "niacinamide", "hyaluronic",
  // concerns
  "anti-aging", "anti-wrinkle", "acne", "blemish", "hydrating", "brightening",
  // sun
  "sunscreen", "suncare", "sun-care", "sun protection", "spf",
  "facial-sunscreen", "in-sun-protection",
  // body
  "body care", "body-care", "body lotion", "body cream", "hand cream",
  // cleansing
  "micellar", "cleansing", "make-up remover", "makeup remover", "wash",
  // beauty generic (OBF tags)
  "beauty", "beauty-products", "non-food-products",
  // hair (still skincare-adjacent in OBF context)
  "shampoo", "conditioner", "hair care", "hair-care",
  // lips
  "lip care", "lip balm", "lip-care",
  // Turkish
  "cilt", "cilt bakimi", "cilt bakim", "nemlendirici", "temizleyici",
  "tonik", "peeling", "maske", "losyon", "yuz", "goz kremi", "goz",
  "gunes koruma", "gunes kremi", "vucut bakimi", "el kremi",
  "yikama", "arindirici",
]

export const MAKEUP_KEYWORDS = [
  "makeup", "make-up", "cosmetic",
  "foundation", "lipstick", "mascara", "eyeliner", "eyeshadow",
  "blush", "concealer", "primer", "contour", "highlighter",
  "nail polish", "nail-polish",
  // Turkish
  "makyaj", "ruj", "rimel", "far", "allik", "kapatici", "fondoten",
]

export const SUPPLEMENT_KEYWORDS = [
  "supplement", "vitamin", "dietary",
  "nutraceutical", "collagen supplement",
  // Turkish
  "takviye", "besin takviyesi",
]

export function inferCategoryFromText(
  ...texts: (string | null | undefined)[]
): "skincare" | "makeup" | "supplement" | "other" {
  const haystack = texts
    .filter(Boolean)
    .map((t) => transliterate(t!).toLowerCase())
    .join(" ")
  if (!haystack) return "other"

  if (SUPPLEMENT_KEYWORDS.some((kw) => haystack.includes(kw))) {
    if (!SKINCARE_KEYWORDS.some((kw) => haystack.includes(kw))) return "supplement"
  }
  if (SKINCARE_KEYWORDS.some((kw) => haystack.includes(kw))) return "skincare"
  if (MAKEUP_KEYWORDS.some((kw) => haystack.includes(kw))) return "makeup"
  if (SUPPLEMENT_KEYWORDS.some((kw) => haystack.includes(kw))) return "supplement"
  return "other"
}

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

// ─── Async image upload to Azure Blob Storage ───────────────────────────────

async function uploadImageToAzure(
  productId: string,
  imageUrl: string,
  brandSlug: string | null,
  productSlug: string,
): Promise<void> {
  try {
    if (!isAzureStorageConfigured()) return;

    await ensureContainer();

    const downloaded = await downloadImage(imageUrl);
    if (!downloaded) return;

    const azureUrl = await uploadProductImage(
      downloaded.buffer,
      brandSlug,
      productSlug,
      downloaded.contentType,
      downloaded.extension,
    );

    const { Product } = getModels();
    await Product.update(
      { imageUrl: azureUrl },
      { where: { id: productId } },
    );
  } catch (err) {
    // Graceful degradation: OBF URL remains if upload fails
    console.error("[image-upload] Failed to upload product image to Azure:", err);
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function resolveProduct(barcode: string, userId: string): Promise<LookupResult> {
  if (!barcode || typeof barcode !== "string") {
    throw new ProductLookupError("INVALID_BARCODE", "Barcode is required", 400);
  }

  const sanitized = barcode.trim();

  // Step 1: Check internal DB — existing products are never re-uploaded
  const internal = await lookupInternal(sanitized);
  if (internal) return internal;

  // Step 2: Query Open Beauty Facts via SDK
  const obfResult = await fetchObfProduct(sanitized);
  if (obfResult.found && obfResult.product) {
    try {
      const persisted = await persistExternalProduct(sanitized, obfResult.product, userId);
      const obfImageUrl = obfResult.product.image_url?.trim() || null;

      // Fire-and-forget: upload image to Azure in the background
      if (obfImageUrl) {
        const brandSlug = persisted.brandName ? slugify(persisted.brandName) : null;
        const resolvedName = resolveProductName(obfResult.product, sanitized);
        const productSlug = slugify(resolvedName) || `product-${sanitized}`;
        uploadImageToAzure(persisted.productId, obfImageUrl, brandSlug, productSlug).catch(() => {});
      }

      return {
        product: {
          id: persisted.productId,
          barcode: sanitized,
          name: resolveProductName(obfResult.product, sanitized),
          brand: persisted.brandName,
          imageUrl: obfImageUrl,
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
