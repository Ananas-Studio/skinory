import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize"
import { USAGE_CATEGORIES_DB } from "./db-types.js"

export class UsageLog extends Model<InferAttributes<UsageLog>, InferCreationAttributes<UsageLog>> {
  declare id: CreationOptional<string>
  declare userId: string
  declare category: (typeof USAGE_CATEGORIES_DB)[number]
  declare metadata: CreationOptional<Record<string, unknown> | null>
  declare createdAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof UsageLog {
    UsageLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "user_id",
          references: { model: "users", key: "id" },
        },
        category: {
          type: DataTypes.ENUM(...USAGE_CATEGORIES_DB),
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: null,
        },
        createdAt: {
          type: DataTypes.DATE,
          field: "created_at",
        },
      },
      {
        sequelize,
        tableName: "usage_logs",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
          { fields: ["user_id", "category", "created_at"] },
        ],
      },
    )
    return UsageLog
  }
}
