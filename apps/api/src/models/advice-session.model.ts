import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { ADVICE_SESSION_STATUSES, ADVICE_SOURCE_TRIGGERS } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class AdviceSession extends Model<InferAttributes<AdviceSession>, InferCreationAttributes<AdviceSession>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare guestSessionId: ForeignKey<string> | null;
  declare title: CreationOptional<string | null>;
  declare status: (typeof ADVICE_SESSION_STATUSES)[number];
  declare sourceTrigger: (typeof ADVICE_SOURCE_TRIGGERS)[number];
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof AdviceSession {
    AdviceSession.init(
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
        guestSessionId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "guest_session_id",
          references: { model: "guest_sessions", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        title: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...ADVICE_SESSION_STATUSES),
          allowNull: false,
          defaultValue: "open",
        },
        sourceTrigger: {
          type: DataTypes.ENUM(...ADVICE_SOURCE_TRIGGERS),
          allowNull: false,
          field: "source_trigger",
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
        tableName: "advice_sessions",
        modelName: "AdviceSession",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ["user_id"] },
          { fields: ["guest_session_id"] },
          { fields: ["status"] },
        ],
      }
    );

    return AdviceSession;
  }

  static associate(models: DbModels): void {
    AdviceSession.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    AdviceSession.belongsTo(models.GuestSession, { foreignKey: "guestSessionId", as: "guestSession" });
    AdviceSession.hasMany(models.AdviceMessage, { foreignKey: "adviceSessionId", as: "messages" });
    AdviceSession.hasMany(models.Recommendation, { foreignKey: "adviceSessionId", as: "recommendations" });
    AdviceSession.hasMany(models.FeedbackEntry, { foreignKey: "adviceSessionId", as: "feedbackEntries" });
  }
}
