import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from "sequelize";
import { AUTH_PROVIDERS, GENDERS } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: CreationOptional<string | null>;
  declare fullName: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare phone: CreationOptional<string | null>;
  declare birthday: CreationOptional<Date | null>;
  declare gender: CreationOptional<(typeof GENDERS)[number] | null>;
  declare authProvider: CreationOptional<(typeof AUTH_PROVIDERS)[number] | null>;
  declare isGuest: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  declare authIdentities?: NonAttribute<unknown[]>;
  declare guestSessions?: NonAttribute<unknown[]>;
  declare skinProfile?: NonAttribute<unknown>;
  declare inventories?: NonAttribute<unknown[]>;
  declare routines?: NonAttribute<unknown[]>;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: true,
          validate: { isEmail: true },
        },
        fullName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "full_name",
        },
        avatarUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "avatar_url",
        },
        phone: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },
        birthday: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        gender: {
          type: DataTypes.ENUM(...GENDERS),
          allowNull: true,
        },
        authProvider: {
          type: DataTypes.ENUM(...AUTH_PROVIDERS),
          allowNull: true,
          field: "auth_provider",
        },
        isGuest: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_guest",
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
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "deleted_at",
        },
      },
      {
        sequelize,
        tableName: "users",
        modelName: "User",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        paranoid: true,
        indexes: [
          { unique: true, fields: ["email"] },
          { fields: ["is_guest"] },
        ],
      }
    );

    return User;
  }

  static associate(models: DbModels): void {
    User.hasMany(models.AuthIdentity, { foreignKey: "userId", as: "authIdentities" });
    User.hasMany(models.GuestSession, { foreignKey: "userId", as: "guestSessions" });
    User.hasOne(models.SkinProfile, { foreignKey: "userId", as: "skinProfile" });
    User.hasMany(models.UserSkinConcern, { foreignKey: "userId", as: "userSkinConcerns" });
    User.belongsToMany(models.SkinConcern, {
      through: models.UserSkinConcern,
      foreignKey: "userId",
      otherKey: "concernId",
      as: "skinConcerns",
    });
    User.hasMany(models.Inventory, { foreignKey: "userId", as: "inventories" });
    User.hasMany(models.Routine, { foreignKey: "userId", as: "routines" });
    User.hasMany(models.Scan, { foreignKey: "userId", as: "scans" });
    User.hasMany(models.Favorite, { foreignKey: "userId", as: "favorites" });
    User.hasMany(models.AdviceSession, { foreignKey: "userId", as: "adviceSessions" });
    User.hasMany(models.FeedbackEntry, { foreignKey: "userId", as: "feedbackEntries" });
    User.hasMany(models.AnalyticsEvent, { foreignKey: "userId", as: "analyticsEvents" });
    User.hasMany(models.UserAllergen, { foreignKey: "userId", as: "userAllergens" });
    User.belongsToMany(models.Allergen, {
      through: models.UserAllergen,
      foreignKey: "userId",
      otherKey: "allergenId",
      as: "allergens",
    });
    User.hasMany(models.UserProductPreference, { foreignKey: "userId", as: "userProductPreferences" });
    User.belongsToMany(models.ProductPreference, {
      through: models.UserProductPreference,
      foreignKey: "userId",
      otherKey: "preferenceId",
      as: "productPreferences",
    });
  }
}
