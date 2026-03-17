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

export class UserSkinConcern extends Model<InferAttributes<UserSkinConcern>, InferCreationAttributes<UserSkinConcern>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare concernId: ForeignKey<string>;
  declare severity: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof UserSkinConcern {
    UserSkinConcern.init(
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
        concernId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "concern_id",
          references: { model: "skin_concerns", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        severity: {
          type: DataTypes.SMALLINT,
          allowNull: true,
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
        tableName: "user_skin_concerns",
        modelName: "UserSkinConcern",
        freezeTableName: true,
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ["user_id", "concern_id"] },
          { fields: ["user_id"] },
        ],
      }
    );

    return UserSkinConcern;
  }

  static associate(models: DbModels): void {
    UserSkinConcern.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    UserSkinConcern.belongsTo(models.SkinConcern, { foreignKey: "concernId", as: "concern" });
  }
}
