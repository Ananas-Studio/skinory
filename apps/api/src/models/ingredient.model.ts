import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import type { DbModels } from "./index.ts";

export class Ingredient extends Model<InferAttributes<Ingredient>, InferCreationAttributes<Ingredient>> {
  declare id: CreationOptional<string>;
  declare inciName: string;
  declare displayName: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare comedogenicRating: CreationOptional<number | null>;
  declare isPotentialAllergen: CreationOptional<boolean>;
  declare isActiveIngredient: CreationOptional<boolean>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Ingredient {
    Ingredient.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        inciName: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          field: "inci_name",
        },
        displayName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "display_name",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        comedogenicRating: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "comedogenic_rating",
        },
        isPotentialAllergen: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_potential_allergen",
        },
        isActiveIngredient: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_active_ingredient",
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
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
        tableName: "ingredients",
        modelName: "Ingredient",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["inci_name"] },
          { fields: ["is_potential_allergen"] },
        ],
      }
    );

    return Ingredient;
  }

  static associate(models: DbModels): void {
    Ingredient.hasMany(models.ProductIngredient, {
      foreignKey: "ingredientId",
      as: "productIngredients",
    });
    Ingredient.belongsToMany(models.Product, {
      through: models.ProductIngredient,
      foreignKey: "ingredientId",
      otherKey: "productId",
      as: "products",
    });
  }
}
