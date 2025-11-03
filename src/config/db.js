// src/config/db.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

let sequelize;

// If Render provides DATABASE_URL, use it directly
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,      // Render requires SSL for external connections
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // Fallback to local connection (for development)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || "",
    {
      host: process.env.DB_HOST,
      dialect: "postgres",
      port: process.env.DB_PORT,
      logging: false,
    }
  );
}

export default sequelize;
