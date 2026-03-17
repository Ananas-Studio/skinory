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

export class Favorite extends Model<InferAttributes<Favorite>, InferCreationAttributes<Favorite>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare productId: ForeignKey<string>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Favorite {
    Favorite.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
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
        tableName: "favorites",
        modelName: "Favorite",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [{ unique: true, fields: ["user_id", "product_id"] }],
      }
    );

    return Favorite;
  }

  static associate(models: DbModels): void {
    Favorite.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Favorite.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
