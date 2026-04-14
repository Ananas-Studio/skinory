import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize"
import type { DbModels } from "./index.ts"

export class Allergen extends Model<InferAttributes<Allergen>, InferCreationAttributes<Allergen>> {
  declare id: CreationOptional<string>
  declare slug: string
  declare name: string
  declare category: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof Allergen {
    Allergen.init(
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
        tableName: "allergens",
        modelName: "Allergen",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ unique: true, fields: ["slug"] }],
      }
    )
    return Allergen
  }

  static associate(models: DbModels): void {
    Allergen.hasMany(models.UserAllergen, { foreignKey: "allergenId", as: "userAllergens" })
    Allergen.belongsToMany(models.User, {
      through: models.UserAllergen,
      foreignKey: "allergenId",
      otherKey: "userId",
      as: "users",
    })
  }
}
