import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize"
import type { DbModels } from "./index.ts"

export class UserAllergen extends Model<InferAttributes<UserAllergen>, InferCreationAttributes<UserAllergen>> {
  declare id: CreationOptional<string>
  declare userId: ForeignKey<string>
  declare allergenId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof UserAllergen {
    UserAllergen.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
        allergenId: { type: DataTypes.UUID, allowNull: false, field: "allergen_id" },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
      },
      {
        sequelize,
        tableName: "user_allergens",
        modelName: "UserAllergen",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["user_id", "allergen_id"] },
        ],
      }
    )
    return UserAllergen
  }

  static associate(models: DbModels): void {
    UserAllergen.belongsTo(models.User, { foreignKey: "userId", as: "user" })
    UserAllergen.belongsTo(models.Allergen, { foreignKey: "allergenId", as: "allergen" })
  }
}
