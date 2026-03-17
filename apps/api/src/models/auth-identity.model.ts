import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { AUTH_PROVIDERS } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class AuthIdentity extends Model<InferAttributes<AuthIdentity>, InferCreationAttributes<AuthIdentity>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare provider: (typeof AUTH_PROVIDERS)[number];
  declare providerUserId: string;
  declare email: CreationOptional<string | null>;
  declare accessToken: CreationOptional<string | null>;
  declare refreshToken: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof AuthIdentity {
    AuthIdentity.init(
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
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        provider: {
          type: DataTypes.ENUM(...AUTH_PROVIDERS),
          allowNull: false,
        },
        providerUserId: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "provider_user_id",
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: { isEmail: true },
        },
        accessToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "access_token",
        },
        refreshToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "refresh_token",
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
        tableName: "auth_identities",
        modelName: "AuthIdentity",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["provider", "provider_user_id"] },
          { fields: ["user_id"] },
        ],
      }
    );

    return AuthIdentity;
  }

  static associate(models: DbModels): void {
    AuthIdentity.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  }
}
