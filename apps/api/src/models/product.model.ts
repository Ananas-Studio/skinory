import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { PRODUCT_CATEGORIES, PRODUCT_SOURCE_TYPES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>;
  declare brandId: ForeignKey<string> | null;
  declare name: string;
  declare slug: string;
  declare category: (typeof PRODUCT_CATEGORIES)[number];
  declare subcategory: CreationOptional<string | null>;
  declare productForm: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare imageUrl: CreationOptional<string | null>;
  declare sourceType: (typeof PRODUCT_SOURCE_TYPES)[number];
  declare sourceConfidence: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Product {
    Product.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        brandId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "brand_id",
          references: { model: "brands", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        slug: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i },
        },
        category: {
          type: DataTypes.ENUM(...PRODUCT_CATEGORIES),
          allowNull: false,
          defaultValue: "other",
        },
        subcategory: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        productForm: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "product_form",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        imageUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "image_url",
        },
        sourceType: {
          type: DataTypes.ENUM(...PRODUCT_SOURCE_TYPES),
          allowNull: false,
          defaultValue: "unknown",
          field: "source_type",
        },
        sourceConfidence: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: true,
          field: "source_confidence",
          comment: "0-1 confidence score as decimal(5,4)",
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active",
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
        tableName: "products",
        modelName: "Product",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["slug"] },
          { fields: ["brand_id"] },
          { fields: ["category"] },
        ],
      }
    );

    return Product;
  }

  static associate(models: DbModels): void {
    Product.belongsTo(models.Brand, { foreignKey: "brandId", as: "brand" });
    Product.hasMany(models.ProductBarcode, { foreignKey: "productId", as: "barcodes" });
    Product.hasMany(models.ProductSource, { foreignKey: "productId", as: "sources" });
    Product.hasMany(models.ProductIngredient, { foreignKey: "productId", as: "productIngredients" });
    Product.belongsToMany(models.Ingredient, {
      through: models.ProductIngredient,
      foreignKey: "productId",
      otherKey: "ingredientId",
      as: "ingredients",
    });
    Product.hasMany(models.InventoryItem, { foreignKey: "productId", as: "inventoryItems" });
    Product.hasMany(models.RoutineStep, { foreignKey: "productId", as: "routineSteps" });
    Product.hasMany(models.Favorite, { foreignKey: "productId", as: "favorites" });
    Product.hasMany(models.Recommendation, { foreignKey: "productId", as: "recommendations" });
  }
}
