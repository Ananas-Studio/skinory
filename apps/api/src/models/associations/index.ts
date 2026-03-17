import type { Sequelize } from "sequelize";
import { initModels } from "../index.js";

const initializeSequelizeAssociations = (sequelize: Sequelize) => {
	return initModels(sequelize);
};

export default initializeSequelizeAssociations;