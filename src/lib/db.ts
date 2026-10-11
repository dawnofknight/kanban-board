import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "../../db/schema";

// Per-request D1 client (never a global — Workers forbid cross-request reuse).
// See https://opennext.js.org/cloudflare/howtos/db
export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
});

export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
});

export type Db = ReturnType<typeof getDb>;
