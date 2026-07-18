import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init: a top-level `neon(process.env.DATABASE_URL!)` call throws at
// module-eval time if DATABASE_URL isn't set, which crashes `next build`
// before env vars are configured. A plain lazy `let` avoids that without the
// Proxy-wrapper pitfall (Proxies break libraries that inspect the client via
// property/method checks).
let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
