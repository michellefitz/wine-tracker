#!/usr/bin/env node
/**
 * Creates (or brings up to date) the two tables the app needs.
 * Safe to run repeatedly.
 *
 *   DATABASE_URL=... npm run db:init
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!match) continue;
        const [, key, rawValue] = match;
        if (process.env[key]) continue;
        process.env[key] = rawValue.replace(/^["']|["']$/g, "");
      }
    } catch {
      // No such file — fine.
    }
  }
}

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,

  `CREATE TABLE IF NOT EXISTS photos (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     mime        text NOT NULL,
     data        text NOT NULL,
     created_at  timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS wines (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     producer    text,
     name        text NOT NULL,
     vintage     integer,
     region      text,
     country     text,
     grapes      jsonb NOT NULL DEFAULT '[]'::jsonb,
     wine_type   text,
     score       smallint NOT NULL,
     tags        jsonb NOT NULL DEFAULT '[]'::jsonb,
     notes       text,
     price_eur   numeric(8,2),
     source      text,
     photo_id    uuid REFERENCES photos(id) ON DELETE SET NULL,
     drank_on    date NOT NULL DEFAULT current_date,
     created_at  timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE INDEX IF NOT EXISTS wines_drank_on_idx ON wines (drank_on DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS wines_score_idx ON wines (score)`,
];

for (const statement of STATEMENTS) {
  await sql.query(statement);
  console.log("ok:", statement.split("\n")[0].trim());
}

console.log("\nDatabase ready.");
