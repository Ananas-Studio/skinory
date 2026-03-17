import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { GUEST_SESSION_PLATFORMS } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class GuestSession extends Model<InferAttributes<GuestSession>, InferCreationAttributes<GuestSession>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare deviceId: string;
  declare anonymousToken: string;
  declare platform: (typeof GUEST_SESSION_PLATFORMS)[number];
  declare appVersion: CreationOptional<string | null>;
  declare lastSeenAt: Date;
  declare expiresAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof GuestSession {
    GuestSession.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        deviceId: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "device_id",
        },
        anonymousToken: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          field: "anonymous_token",
        },
        platform: {
          type: DataTypes.ENUM(...GUEST_SESSION_PLATFORMS),
          allowNull: false,
        },
        appVersion: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "app_version",
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "last_seen_at",
          defaultValue: DataTypes.NOW,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "expires_at",
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
        tableName: "guest_sessions",
        modelName: "GuestSession",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ["anonymous_token"] },
          { fields: ["user_id"] },
          { fields: ["device_id"] },
        ],
      }
    );

    return GuestSession;
  }

  static associate(models: DbModels): void {
    GuestSession.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    GuestSession.hasMany(models.Scan, { foreignKey: "guestSessionId", as: "scans" });
    GuestSession.hasMany(models.AdviceSession, { foreignKey: "guestSessionId", as: "adviceSessions" });
    GuestSession.hasMany(models.AnalyticsEvent, { foreignKey: "guestSessionId", as: "analyticsEvents" });
  }
}
