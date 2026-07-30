import { defineConfig } from "drizzle-kit";

// Paths are resolved relative to the CWD the CLI is invoked from (the repo root,
// per the package.json db:generate/db:push scripts), not relative to this file.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
