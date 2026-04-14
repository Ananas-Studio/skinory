import type { Sequelize } from "sequelize";
import { AdviceMessage } from "./advice-message.model.js";
import { AdviceSession } from "./advice-session.model.js";
import { Allergen } from "./allergen.model.js";
import { AnalyticsEvent } from "./analytics-event.model.js";
import { AuthIdentity } from "./auth-identity.model.js";
import { Brand } from "./brand.model.js";
import { Favorite } from "./favorite.model.js";
import { FeedbackEntry } from "./feedback-entry.model.js";
import { GuestSession } from "./guest-session.model.js";
import { Ingredient } from "./ingredient.model.js";
import { InventoryItem } from "./inventory-item.model.js";
import { Inventory } from "./inventory.model.js";
import { ProductBarcode } from "./product-barcode.model.js";
import { ProductIngredient } from "./product-ingredient.model.js";
import { ProductPreference } from "./product-preference.model.js";
import { ProductSource } from "./product-source.model.js";
import { Product } from "./product.model.js";
import { Recommendation } from "./recommendation.model.js";
import { RoutineStep } from "./routine-step.model.js";
import { Routine } from "./routine.model.js";
import { Scan } from "./scan.model.js";
import { SkinConcern } from "./skin-concern.model.js";
import { SkinProfile } from "./skin-profile.model.js";
import { UserAllergen } from "./user-allergen.model.js";
import { UserProductPreference } from "./user-product-preference.model.js";
import { UserSkinConcern } from "./user-skin-concern.model.js";
import { User } from "./user.model.js";

export interface DbModels {
  User: typeof User;
  AuthIdentity: typeof AuthIdentity;
  GuestSession: typeof GuestSession;
  Brand: typeof Brand;
  Product: typeof Product;
  ProductBarcode: typeof ProductBarcode;
  ProductSource: typeof ProductSource;
  Ingredient: typeof Ingredient;
  ProductIngredient: typeof ProductIngredient;
  SkinProfile: typeof SkinProfile;
  SkinConcern: typeof SkinConcern;
  UserSkinConcern: typeof UserSkinConcern;
  Allergen: typeof Allergen;
  UserAllergen: typeof UserAllergen;
  ProductPreference: typeof ProductPreference;
  UserProductPreference: typeof UserProductPreference;
  Inventory: typeof Inventory;
  InventoryItem: typeof InventoryItem;
  Routine: typeof Routine;
  RoutineStep: typeof RoutineStep;
  Scan: typeof Scan;
  Favorite: typeof Favorite;
  AdviceSession: typeof AdviceSession;
  AdviceMessage: typeof AdviceMessage;
  Recommendation: typeof Recommendation;
  FeedbackEntry: typeof FeedbackEntry;
  AnalyticsEvent: typeof AnalyticsEvent;
}

let cachedModels: DbModels | null = null;

export function initModels(sequelize: Sequelize): DbModels {
  if (cachedModels) {
    return cachedModels;
  }

  const models: DbModels = {
    User: User.initModel(sequelize),
    AuthIdentity: AuthIdentity.initModel(sequelize),
    GuestSession: GuestSession.initModel(sequelize),
    Brand: Brand.initModel(sequelize),
    Product: Product.initModel(sequelize),
    ProductBarcode: ProductBarcode.initModel(sequelize),
    ProductSource: ProductSource.initModel(sequelize),
    Ingredient: Ingredient.initModel(sequelize),
    ProductIngredient: ProductIngredient.initModel(sequelize),
    SkinProfile: SkinProfile.initModel(sequelize),
    SkinConcern: SkinConcern.initModel(sequelize),
    UserSkinConcern: UserSkinConcern.initModel(sequelize),
    Allergen: Allergen.initModel(sequelize),
    UserAllergen: UserAllergen.initModel(sequelize),
    ProductPreference: ProductPreference.initModel(sequelize),
    UserProductPreference: UserProductPreference.initModel(sequelize),
    Inventory: Inventory.initModel(sequelize),
    InventoryItem: InventoryItem.initModel(sequelize),
    Routine: Routine.initModel(sequelize),
    RoutineStep: RoutineStep.initModel(sequelize),
    Scan: Scan.initModel(sequelize),
    Favorite: Favorite.initModel(sequelize),
    AdviceSession: AdviceSession.initModel(sequelize),
    AdviceMessage: AdviceMessage.initModel(sequelize),
    Recommendation: Recommendation.initModel(sequelize),
    FeedbackEntry: FeedbackEntry.initModel(sequelize),
    AnalyticsEvent: AnalyticsEvent.initModel(sequelize),
  };

  Object.values(models).forEach((model) => {
    if (typeof model.associate === "function") {
      model.associate(models);
    }
  });

  cachedModels = models;
  return models;
}

export function getModels(): DbModels {
  if (!cachedModels) {
    throw new Error("Models are not initialized. Call initModels(sequelize) first.");
  }

  return cachedModels;
}
