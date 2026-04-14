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

export class UserProductPreference extends Model<InferAttributes<UserProductPreference>, InferCreationAttributes<UserProductPreference>> {
  declare id: CreationOptional<string>
  declare userId: ForeignKey<string>
  declare preferenceId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof UserProductPreference {
    UserProductPreference.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
        preferenceId: { type: DataTypes.UUID, allowNull: false, field: "preference_id" },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
      },
      {
        sequelize,
        tableName: "user_product_preferences",
        modelName: "UserProductPreference",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ["user_id", "preference_id"] },
        ],
      }
    )
    return UserProductPreference
  }

  static associate(models: DbModels): void {
    UserProductPreference.belongsTo(models.User, { foreignKey: "userId", as: "user" })
    UserProductPreference.belongsTo(models.ProductPreference, { foreignKey: "preferenceId", as: "preference" })
  }
}
