import dotenv from "dotenv";

// Mirror Next.js env loading order: .env.local overrides .env
dotenv.config({ path: ".env.local" });
dotenv.config();

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
