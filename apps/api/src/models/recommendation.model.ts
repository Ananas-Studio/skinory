import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { RECOMMENDATION_TYPES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class Recommendation extends Model<InferAttributes<Recommendation>, InferCreationAttributes<Recommendation>> {
  declare id: CreationOptional<string>;
  declare adviceSessionId: ForeignKey<string>;
  declare productId: ForeignKey<string> | null;
  declare recommendationType: (typeof RECOMMENDATION_TYPES)[number];
  declare shortReason: string;
  declare rankOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Recommendation {
    Recommendation.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        adviceSessionId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "advice_session_id",
          references: { model: "advice_sessions", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        recommendationType: {
          type: DataTypes.ENUM(...RECOMMENDATION_TYPES),
          allowNull: false,
          field: "recommendation_type",
        },
        shortReason: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: "short_reason",
        },
        rankOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "rank_order",
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
        tableName: "recommendations",
        modelName: "Recommendation",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { fields: ["advice_session_id"] },
          { fields: ["product_id"] },
          { fields: ["advice_session_id", "rank_order"] },
        ],
      }
    );

    return Recommendation;
  }

  static associate(models: DbModels): void {
    Recommendation.belongsTo(models.AdviceSession, {
      foreignKey: "adviceSessionId",
      as: "adviceSession",
    });
    Recommendation.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
