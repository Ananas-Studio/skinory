import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { ADVICE_MESSAGE_ROLES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class AdviceMessage extends Model<InferAttributes<AdviceMessage>, InferCreationAttributes<AdviceMessage>> {
  declare id: CreationOptional<string>;
  declare adviceSessionId: ForeignKey<string>;
  declare role: (typeof ADVICE_MESSAGE_ROLES)[number];
  declare content: string;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof AdviceMessage {
    AdviceMessage.init(
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
        role: {
          type: DataTypes.ENUM(...ADVICE_MESSAGE_ROLES),
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
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
      },
      {
        sequelize,
        tableName: "advice_messages",
        modelName: "AdviceMessage",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [{ fields: ["advice_session_id", "created_at"] }],
      }
    );

    return AdviceMessage;
  }

  static associate(models: DbModels): void {
    AdviceMessage.belongsTo(models.AdviceSession, {
      foreignKey: "adviceSessionId",
      as: "adviceSession",
    });
  }
}
