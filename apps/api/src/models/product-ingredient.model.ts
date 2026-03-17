import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import type { DbModels } from "./index.ts";

export class ProductIngredient extends Model<InferAttributes<ProductIngredient>, InferCreationAttributes<ProductIngredient>> {
  declare id: CreationOptional<string>;
  declare productId: ForeignKey<string>;
  declare ingredientId: ForeignKey<string>;
  declare ingredientOrder: CreationOptional<number | null>;
  declare concentrationText: CreationOptional<string | null>;
  declare rawLabel: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ProductIngredient {
    ProductIngredient.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        ingredientId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "ingredient_id",
          references: { model: "ingredients", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        ingredientOrder: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "ingredient_order",
        },
        concentrationText: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "concentration_text",
        },
        rawLabel: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "raw_label",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at",
        },
      },
      {
        sequelize,
        tableName: "product_ingredients",
        modelName: "ProductIngredient",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ["product_id", "ingredient_id"] },
          { fields: ["product_id", "ingredient_order"] },
        ],
      }
    );

    return ProductIngredient;
  }

  static associate(models: DbModels): void {
    ProductIngredient.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
    ProductIngredient.belongsTo(models.Ingredient, { foreignKey: "ingredientId", as: "ingredient" });
  }
}
