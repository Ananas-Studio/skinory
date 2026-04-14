import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize"
import type { DbModels } from "./index.ts"

export class ProductPreference extends Model<InferAttributes<ProductPreference>, InferCreationAttributes<ProductPreference>> {
  declare id: CreationOptional<string>
  declare slug: string
  declare name: string
  declare category: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof ProductPreference {
    ProductPreference.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        slug: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        category: { type: DataTypes.STRING, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
      },
      {
        sequelize,
        tableName: "product_preferences",
        modelName: "ProductPreference",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ unique: true, fields: ["slug"] }],
      }
    )
    return ProductPreference
  }

  static associate(models: DbModels): void {
    ProductPreference.hasMany(models.UserProductPreference, { foreignKey: "preferenceId", as: "userPreferences" })
    ProductPreference.belongsToMany(models.User, {
      through: models.UserProductPreference,
      foreignKey: "preferenceId",
      otherKey: "userId",
      as: "users",
    })
  }
}
