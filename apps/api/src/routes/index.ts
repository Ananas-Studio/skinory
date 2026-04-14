import { Router } from "express";
import { adviceRouter } from "./advice.route.js";
import { authRouter } from "./auth.route.js";
import { favoritesRouter } from "./favorites.route.js";
import { inventoryRouter } from "./inventory.route.js";
import { productsRouter } from "./products.route.js";
import { profileRouter } from "./profile.route.js";
import { routineRouter } from "./routine.route.js";
import { scanRouter } from "./scan.route.js";
import { socialRouter } from "./social.route.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/advice", adviceRouter);
router.use("/favorites", favoritesRouter);
router.use("/inventory", inventoryRouter);
router.use("/products", productsRouter);
router.use("/profile", profileRouter);
router.use("/routine", routineRouter);
router.use("/scan", scanRouter);
router.use("/social", socialRouter);

export { router };
