import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { INVENTORY_ITEM_SOURCES, INVENTORY_ITEM_STATUSES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class InventoryItem extends Model<InferAttributes<InventoryItem>, InferCreationAttributes<InventoryItem>> {
  declare id: CreationOptional<string>;
  declare inventoryId: ForeignKey<string>;
  declare productId: ForeignKey<string>;
  declare openedAt: CreationOptional<Date | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare status: (typeof INVENTORY_ITEM_STATUSES)[number];
  declare source: (typeof INVENTORY_ITEM_SOURCES)[number];
  declare purchaseConfirmed: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof InventoryItem {
    InventoryItem.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        inventoryId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "inventory_id",
          references: { model: "inventories", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        },
        openedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "opened_at",
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "expires_at",
        },
        status: {
          type: DataTypes.ENUM(...INVENTORY_ITEM_STATUSES),
          allowNull: false,
          defaultValue: "active",
        },
        source: {
          type: DataTypes.ENUM(...INVENTORY_ITEM_SOURCES),
          allowNull: false,
          defaultValue: "scan",
        },
        purchaseConfirmed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "purchase_confirmed",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at",
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "updated_at",
        },
      },
      {
        sequelize,
        tableName: "inventory_items",
        modelName: "InventoryItem",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ["inventory_id"] },
          { fields: ["product_id"] },
          // Intentionally non-unique to avoid blocking legitimate repurchases.
          { fields: ["inventory_id", "product_id", "status"] },
          { fields: ["inventory_id", "status"] },
        ],
      }
    );

    return InventoryItem;
  }

  static associate(models: DbModels): void {
    InventoryItem.belongsTo(models.Inventory, { foreignKey: "inventoryId", as: "inventory" });
    InventoryItem.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
    InventoryItem.hasMany(models.RoutineStep, { foreignKey: "inventoryItemId", as: "routineSteps" });
  }
}
