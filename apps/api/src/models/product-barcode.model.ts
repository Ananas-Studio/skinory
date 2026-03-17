import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { BARCODE_FORMATS } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class ProductBarcode extends Model<InferAttributes<ProductBarcode>, InferCreationAttributes<ProductBarcode>> {
  declare id: CreationOptional<string>;
  declare productId: ForeignKey<string>;
  declare barcode: string;
  declare barcodeFormat: (typeof BARCODE_FORMATS)[number];
  declare isPrimary: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ProductBarcode {
    ProductBarcode.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        barcode: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        barcodeFormat: {
          type: DataTypes.ENUM(...BARCODE_FORMATS),
          allowNull: false,
          defaultValue: "OTHER",
          field: "barcode_format",
        },
        isPrimary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_primary",
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
        tableName: "product_barcodes",
        modelName: "ProductBarcode",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ["barcode"] },
          { fields: ["product_id"] },
        ],
      }
    );

    return ProductBarcode;
  }

  static associate(models: DbModels): void {
    ProductBarcode.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
