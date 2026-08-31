import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The Prisma CLI (migrate, studio, db pull/push) needs a direct,
    // non-pooled connection — PgBouncer's transaction pooling mode doesn't
    // support the advisory locks and prepared statements migrations need.
    // The app's runtime client (lib/prisma.ts) uses the pooled DATABASE_URL
    // instead, read directly from process.env, independent of this file.
    url: env("DIRECT_URL"),
  },
});
