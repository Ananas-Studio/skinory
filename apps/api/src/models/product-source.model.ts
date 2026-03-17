import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { PRODUCT_SOURCE_KINDS, SCRAPE_STATUSES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class ProductSource extends Model<InferAttributes<ProductSource>, InferCreationAttributes<ProductSource>> {
  declare id: CreationOptional<string>;
  declare productId: ForeignKey<string>;
  declare sourceKind: (typeof PRODUCT_SOURCE_KINDS)[number];
  declare sourceUrl: CreationOptional<string | null>;
  declare rawPayload: CreationOptional<Record<string, unknown> | null>;
  declare scrapeStatus: CreationOptional<(typeof SCRAPE_STATUSES)[number] | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ProductSource {
    ProductSource.init(
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
        sourceKind: {
          type: DataTypes.ENUM(...PRODUCT_SOURCE_KINDS),
          allowNull: false,
          field: "source_kind",
        },
        sourceUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "source_url",
        },
        rawPayload: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: "raw_payload",
        },
        scrapeStatus: {
          type: DataTypes.ENUM(...SCRAPE_STATUSES),
          allowNull: true,
          field: "scrape_status",
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
        tableName: "product_sources",
        modelName: "ProductSource",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ fields: ["product_id"] }, { fields: ["source_kind"] }],
      }
    );

    return ProductSource;
  }

  static associate(models: DbModels): void {
    ProductSource.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
