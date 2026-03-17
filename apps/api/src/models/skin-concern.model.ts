import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import type { DbModels } from "./index.ts";

export class SkinConcern extends Model<InferAttributes<SkinConcern>, InferCreationAttributes<SkinConcern>> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof SkinConcern {
    SkinConcern.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        slug: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
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
        tableName: "skin_concerns",
        modelName: "SkinConcern",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ unique: true, fields: ["slug"] }],
      }
    );

    return SkinConcern;
  }

  static associate(models: DbModels): void {
    SkinConcern.hasMany(models.UserSkinConcern, {
      foreignKey: "concernId",
      as: "userSkinConcerns",
    });
    SkinConcern.belongsToMany(models.User, {
      through: models.UserSkinConcern,
      foreignKey: "concernId",
      otherKey: "userId",
      as: "users",
    });
  }
}
