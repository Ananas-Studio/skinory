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

export class RoutineStep extends Model<InferAttributes<RoutineStep>, InferCreationAttributes<RoutineStep>> {
  declare id: CreationOptional<string>;
  declare routineId: ForeignKey<string>;
  declare inventoryItemId: ForeignKey<string> | null;
  declare productId: ForeignKey<string> | null;
  declare stepOrder: number;
  declare usageInstruction: CreationOptional<string | null>;
  declare timingNote: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof RoutineStep {
    RoutineStep.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        routineId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "routine_id",
          references: { model: "routines", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        inventoryItemId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "inventory_item_id",
          references: { model: "inventory_items", key: "id" },
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
        stepOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "step_order",
        },
        usageInstruction: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "usage_instruction",
        },
        timingNote: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "timing_note",
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
        tableName: "routine_steps",
        modelName: "RoutineStep",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        validate: {
          hasTargetReference() {
            if (!this.inventoryItemId && !this.productId) {
              throw new Error("RoutineStep requires either inventoryItemId or productId.");
            }
          },
        },
        indexes: [
          { fields: ["routine_id", "step_order"] },
          { fields: ["inventory_item_id"] },
          { fields: ["product_id"] },
        ],
      }
    );

    return RoutineStep;
  }

  static associate(models: DbModels): void {
    RoutineStep.belongsTo(models.Routine, { foreignKey: "routineId", as: "routine" });
    RoutineStep.belongsTo(models.InventoryItem, {
      foreignKey: "inventoryItemId",
      as: "inventoryItem",
    });
    RoutineStep.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}
