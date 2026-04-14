import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";
import { SENSITIVITY_LEVELS, SKIN_TYPES, FITZPATRICK_TYPES, CLIMATE_TYPES, EXERCISE_FREQUENCIES, DIET_TYPES, SMOKING_STATUSES } from "./db-types.js";
import type { DbModels } from "./index.ts";

export class SkinProfile extends Model<InferAttributes<SkinProfile>, InferCreationAttributes<SkinProfile>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare skinType: CreationOptional<(typeof SKIN_TYPES)[number] | null>;
  declare sensitivityLevel: CreationOptional<(typeof SENSITIVITY_LEVELS)[number] | null>;
  declare fitzpatrickType: CreationOptional<(typeof FITZPATRICK_TYPES)[number] | null>;
  declare acneProne: CreationOptional<boolean | null>;
  declare notes: CreationOptional<string | null>;
  // Lifestyle
  declare climateType: CreationOptional<(typeof CLIMATE_TYPES)[number] | null>;
  declare sunExposure: CreationOptional<number | null>;
  declare pollutionExposure: CreationOptional<number | null>;
  declare stressLevel: CreationOptional<number | null>;
  declare sleepQuality: CreationOptional<number | null>;
  declare hydrationLevel: CreationOptional<number | null>;
  declare exerciseFrequency: CreationOptional<(typeof EXERCISE_FREQUENCIES)[number] | null>;
  declare dietType: CreationOptional<(typeof DIET_TYPES)[number] | null>;
  declare smokingStatus: CreationOptional<(typeof SMOKING_STATUSES)[number] | null>;
  declare screenTime: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof SkinProfile {
    SkinProfile.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          field: "user_id",
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        skinType: {
          type: DataTypes.ENUM(...SKIN_TYPES),
          allowNull: true,
          field: "skin_type",
        },
        sensitivityLevel: {
          type: DataTypes.ENUM(...SENSITIVITY_LEVELS),
          allowNull: true,
          field: "sensitivity_level",
        },
        acneProne: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: "acne_prone",
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        fitzpatrickType: {
          type: DataTypes.ENUM(...FITZPATRICK_TYPES),
          allowNull: true,
          field: "fitzpatrick_type",
        },
        climateType: {
          type: DataTypes.ENUM(...CLIMATE_TYPES),
          allowNull: true,
          field: "climate_type",
        },
        sunExposure: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "sun_exposure",
          validate: { min: 1, max: 5 },
        },
        pollutionExposure: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "pollution_exposure",
          validate: { min: 1, max: 5 },
        },
        stressLevel: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "stress_level",
          validate: { min: 1, max: 5 },
        },
        sleepQuality: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "sleep_quality",
          validate: { min: 1, max: 5 },
        },
        hydrationLevel: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "hydration_level",
          validate: { min: 1, max: 5 },
        },
        exerciseFrequency: {
          type: DataTypes.ENUM(...EXERCISE_FREQUENCIES),
          allowNull: true,
          field: "exercise_frequency",
        },
        dietType: {
          type: DataTypes.ENUM(...DIET_TYPES),
          allowNull: true,
          field: "diet_type",
        },
        smokingStatus: {
          type: DataTypes.ENUM(...SMOKING_STATUSES),
          allowNull: true,
          field: "smoking_status",
        },
        screenTime: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          field: "screen_time",
          validate: { min: 1, max: 5 },
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
        tableName: "skin_profiles",
        modelName: "SkinProfile",
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        indexes: [{ unique: true, fields: ["user_id"] }],
      }
    );

    return SkinProfile;
  }

  static associate(models: DbModels): void {
    SkinProfile.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  }
}
