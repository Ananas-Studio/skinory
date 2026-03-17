import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import type { DbModels } from "./index.ts";

export class Brand extends Model<InferAttributes<Brand>, InferCreationAttributes<Brand>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare slug: string;
  declare websiteUrl: CreationOptional<string | null>;
  declare logoUrl: CreationOptional<string | null>;
  declare countryCode: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Brand {
    Brand.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        slug: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i },
        },
        websiteUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "website_url",
        },
        logoUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "logo_url",
        },
        countryCode: {
          type: DataTypes.STRING(2),
          allowNull: true,
          field: "country_code",
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
        tableName: "brands",
        modelName: "Brand",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["name"] },
          { unique: true, fields: ["slug"] },
        ],
      }
    );

    return Brand;
  }

  static associate(models: DbModels): void {
    Brand.hasMany(models.Product, { foreignKey: "brandId", as: "products" });
  }
}
