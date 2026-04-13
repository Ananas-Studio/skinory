import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { SCAN_RESULT_STATUSES, SCAN_TYPES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class Scan extends Model<InferAttributes<Scan>, InferCreationAttributes<Scan>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare guestSessionId: ForeignKey<string> | null;
  declare productId: ForeignKey<string> | null;
  declare barcodeValue: CreationOptional<string | null>;
  declare scanType: (typeof SCAN_TYPES)[number];
  declare resultStatus: (typeof SCAN_RESULT_STATUSES)[number];
  declare failureReason: CreationOptional<string | null>;
  declare scanDurationMs: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Scan {
    Scan.init(
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
        productId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "product_id",
          references: { model: "products", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        barcodeValue: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "barcode_value",
        },
        scanType: {
          type: DataTypes.ENUM(...SCAN_TYPES),
          allowNull: false,
          field: "scan_type",
        },
        resultStatus: {
          type: DataTypes.ENUM(...SCAN_RESULT_STATUSES),
          allowNull: false,
          field: "result_status",
          defaultValue: "partial",
        },
        failureReason: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "failure_reason",
        },
        scanDurationMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "scan_duration_ms",
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
        tableName: "scans",
        modelName: "Scan",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { fields: ["user_id"] },
          { fields: ["guest_session_id"] },
          { fields: ["product_id"] },
          { fields: ["result_status"] },
        ],
      }
    );

    return Scan;
  }

  static associate(models: DbModels): void {
    Scan.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Scan.belongsTo(models.GuestSession, { foreignKey: "guestSessionId", as: "guestSession" });
    Scan.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
