import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "DATABASE_URL is not set. Accounts, login, and game history are unavailable; guest play is unaffected.",
  );
}

// postgres-js connects lazily, so this is safe to construct even with an
// empty connection string — queries will fail (and be caught) only if
// something actually tries to use accounts while unconfigured.
const client = postgres(connectionString ?? "", {
  ssl: "require",
  max: 10,
  // Session-pooler (production) supports prepared statements fine, but
  // transaction-mode poolers (used for local dev here, see .env / README —
  // this network blocks port 5432 directly) explicitly do not: a statement
  // prepared on one pooled backend can silently misbehave when a later
  // query in the same logical connection lands on a different backend.
  // Disabling it costs a little caching, never correctness, on either mode.
  prepare: false,
});

export const db = drizzle(client, { schema });
