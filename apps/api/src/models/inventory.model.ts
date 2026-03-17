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

export class Inventory extends Model<InferAttributes<Inventory>, InferCreationAttributes<Inventory>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare name: CreationOptional<string>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof Inventory {
    Inventory.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "My Inventory",
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active",
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
        tableName: "inventories",
        modelName: "Inventory",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ fields: ["user_id", "is_active"] }],
      }
    );

    return Inventory;
  }

  static associate(models: DbModels): void {
    Inventory.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Inventory.hasMany(models.InventoryItem, { foreignKey: "inventoryId", as: "items" });
  }
}
