import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Only needed for `drizzle-kit push`/`studio`; `generate` works without it.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/shelf",
  },
} satisfies Config;
