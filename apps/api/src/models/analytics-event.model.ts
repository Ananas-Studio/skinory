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

export class AnalyticsEvent extends Model<InferAttributes<AnalyticsEvent>, InferCreationAttributes<AnalyticsEvent>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare guestSessionId: ForeignKey<string> | null;
  declare eventName: string;
  declare eventProperties: CreationOptional<Record<string, unknown> | null>;
  declare page: CreationOptional<string | null>;
  declare triggerType: CreationOptional<string | null>;
  declare ctaName: CreationOptional<string | null>;
  declare sessionId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof AnalyticsEvent {
    AnalyticsEvent.init(
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
        eventName: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "event_name",
        },
        eventProperties: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: "event_properties",
        },
        page: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        triggerType: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "trigger_type",
        },
        ctaName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "cta_name",
        },
        sessionId: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "session_id",
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
        tableName: "analytics_events",
        modelName: "AnalyticsEvent",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { fields: ["user_id"] },
          { fields: ["guest_session_id"] },
          { fields: ["event_name"] },
          { fields: ["session_id"] },
          { fields: ["created_at"] },
        ],
      }
    );

    return AnalyticsEvent;
  }

  static associate(models: DbModels): void {
    AnalyticsEvent.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    AnalyticsEvent.belongsTo(models.GuestSession, {
      foreignKey: "guestSessionId",
      as: "guestSession",
    });
  }
}
