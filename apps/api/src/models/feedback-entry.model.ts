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

export class FeedbackEntry extends Model<InferAttributes<FeedbackEntry>, InferCreationAttributes<FeedbackEntry>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare adviceSessionId: ForeignKey<string> | null;
  declare rating: CreationOptional<number | null>;
  declare comment: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof FeedbackEntry {
    FeedbackEntry.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        adviceSessionId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "advice_session_id",
          references: { model: "advice_sessions", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        rating: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        tableName: "feedback_entries",
        modelName: "FeedbackEntry",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [{ fields: ["user_id"] }, { fields: ["advice_session_id"] }],
      }
    );

    return FeedbackEntry;
  }

  static associate(models: DbModels): void {
    FeedbackEntry.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    FeedbackEntry.belongsTo(models.AdviceSession, {
      foreignKey: "adviceSessionId",
      as: "adviceSession",
    });
  }
}
