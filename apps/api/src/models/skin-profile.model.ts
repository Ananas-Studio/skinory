import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { SENSITIVITY_LEVELS, SKIN_TYPES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class SkinProfile extends Model<InferAttributes<SkinProfile>, InferCreationAttributes<SkinProfile>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare skinType: CreationOptional<(typeof SKIN_TYPES)[number] | null>;
  declare sensitivityLevel: CreationOptional<(typeof SENSITIVITY_LEVELS)[number] | null>;
  declare acneProne: CreationOptional<boolean | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof SkinProfile {
    SkinProfile.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        skinType: {
          type: DataTypes.ENUM(...SKIN_TYPES),
          allowNull: true,
          field: "skin_type",
        },
        sensitivityLevel: {
          type: DataTypes.ENUM(...SENSITIVITY_LEVELS),
          allowNull: true,
          field: "sensitivity_level",
        },
        acneProne: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: "acne_prone",
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        tableName: "skin_profiles",
        modelName: "SkinProfile",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ unique: true, fields: ["user_id"] }],
      }
    );

    return SkinProfile;
  }

  static associate(models: DbModels): void {
    SkinProfile.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  }
}
