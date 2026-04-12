import { getModels } from "../models/index.js"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryItemView {
  id: string
  productId: string
  productName: string
  brandName: string | null
  imageUrl: string | null
  category: string
  status: string
  source: string
  createdAt: Date
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class InventoryServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "InventoryServiceError"
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateInventory(userId: string): Promise<string> {
  const { Inventory } = getModels()

  const existing = await Inventory.findOne({
    where: { userId, isActive: true },
  })

  if (existing) return existing.id

  const created = await Inventory.create({
    userId,
    name: "My Inventory",
    isActive: true,
  })

  return created.id
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function addItem(
  userId: string,
  productId: string,
  source: "scan" | "url" | "manual" = "scan",
): Promise<{ id: string; alreadyExisted: boolean }> {
  const { InventoryItem, Product } = getModels()

  const product = await Product.findByPk(productId)
  if (!product) {
    throw new InventoryServiceError(
      "PRODUCT_NOT_FOUND",
      404,
      "Product not found",
    )
  }

  const inventoryId = await getOrCreateInventory(userId)

  const existing = await InventoryItem.findOne({
    where: { inventoryId, productId, status: "active" },
  })

  if (existing) {
    return { id: existing.id, alreadyExisted: true }
  }

  const item = await InventoryItem.create({
    inventoryId,
    productId,
    status: "active",
    source,
    purchaseConfirmed: false,
  })

  return { id: item.id, alreadyExisted: false }
}

export async function listItems(userId: string): Promise<InventoryItemView[]> {
  const { Inventory, InventoryItem, Product, Brand } = getModels()

  const inventory = await Inventory.findOne({
    where: { userId, isActive: true },
  })

  if (!inventory) return []

  const items = await InventoryItem.findAll({
    where: { inventoryId: inventory.id, status: "active" },
    include: [
      {
        model: Product,
        as: "product",
        include: [{ model: Brand, as: "brand" }],
      },
    ],
    order: [["createdAt", "DESC"]],
  })

  return items.map((item) => {
    const product = (item as any).product
    return {
      id: item.id,
      productId: item.productId,
      productName: product?.name ?? "Unknown",
      brandName: product?.brand?.name ?? null,
      imageUrl: product?.imageUrl ?? null,
      category: product?.category ?? "other",
      status: item.status,
      source: item.source,
      createdAt: item.createdAt,
    }
  })
}

export async function removeItem(userId: string, itemId: string): Promise<void> {
  const { Inventory, InventoryItem } = getModels()

  const inventory = await Inventory.findOne({
    where: { userId, isActive: true },
  })

  if (!inventory) {
    throw new InventoryServiceError(
      "INVENTORY_NOT_FOUND",
      404,
      "Inventory not found",
    )
  }

  const item = await InventoryItem.findOne({
    where: { id: itemId, inventoryId: inventory.id },
  })

  if (!item) {
    throw new InventoryServiceError(
      "INVENTORY_ITEM_NOT_FOUND",
      404,
      "Item not found",
    )
  }

  item.status = "inactive"
  await item.save()
}

export function toPublicError(error: unknown): InventoryServiceError {
  if (error instanceof InventoryServiceError) return error
  console.error("Inventory service error:", error)
  return new InventoryServiceError("INTERNAL_SERVER_ERROR", 500, "Unexpected server error")
}
