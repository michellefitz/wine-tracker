#!/usr/bin/env node
/**
 * Creates (or brings up to date) the tables the app needs.
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

  // Reference notes about grape varieties. Written once by Claude and kept, so
  // reading up on Malbec costs an API call the first time and nothing after.
  `CREATE TABLE IF NOT EXISTS grapes (
     slug           text PRIMARY KEY,
     name           text NOT NULL,
     also_known_as  jsonb NOT NULL DEFAULT '[]'::jsonb,
     colour         text,
     summary        text NOT NULL,
     acidity        smallint,
     body           smallint,
     tannin         smallint,
     sweetness      smallint,
     flavours       jsonb NOT NULL DEFAULT '[]'::jsonb,
     regions        jsonb NOT NULL DEFAULT '[]'::jsonb,
     pairings       jsonb NOT NULL DEFAULT '[]'::jsonb,
     -- Not "similar": that's a reserved word in Postgres (SIMILAR TO).
     similar_grapes jsonb NOT NULL DEFAULT '[]'::jsonb,
     facts          jsonb NOT NULL DEFAULT '[]'::jsonb,
     version        smallint NOT NULL DEFAULT 1,
     created_at     timestamptz NOT NULL DEFAULT now()
   )`,

  // What the web knows about one specific bottle, as opposed to what you made
  // of it. Looked up once and kept; `found = false` is recorded too, so a
  // bottle nobody has written about isn't searched for again on every visit.
  `CREATE TABLE IF NOT EXISTS wine_facts (
     wine_id      uuid PRIMARY KEY REFERENCES wines(id) ON DELETE CASCADE,
     found        boolean NOT NULL DEFAULT false,
     summary      text,
     style        text,
     grapes       jsonb NOT NULL DEFAULT '[]'::jsonb,
     ratings      jsonb NOT NULL DEFAULT '[]'::jsonb,
     details      jsonb NOT NULL DEFAULT '[]'::jsonb,
     awards       jsonb NOT NULL DEFAULT '[]'::jsonb,
     food         jsonb NOT NULL DEFAULT '[]'::jsonb,
     sources      jsonb NOT NULL DEFAULT '[]'::jsonb,
     place        jsonb,
     note         text,
     version      smallint NOT NULL DEFAULT 1,
     looked_up_at timestamptz NOT NULL DEFAULT now()
   )`,

  // Added after wine_facts shipped, so existing tables need them too.
  `ALTER TABLE wine_facts ADD COLUMN IF NOT EXISTS grapes jsonb NOT NULL DEFAULT '[]'::jsonb`,

  // Where the bottle goes on the map: the region path the lookup found, and a
  // coordinate for the narrowest step of it. Null until a bottle is looked up
  // again — FACTS_VERSION carries that.
  `ALTER TABLE wine_facts ADD COLUMN IF NOT EXISTS place jsonb`,

  // Every spelling that leads to a profile: what you typed, the canonical name,
  // and its synonyms, all flattened to lowercase. A null slug records "we asked
  // once and it isn't a grape", so a stray word in the grapes field is only
  // ever looked up once.
  `CREATE TABLE IF NOT EXISTS grape_aliases (
     alias       text PRIMARY KEY,
     slug        text REFERENCES grapes(slug) ON DELETE CASCADE,
     created_at  timestamptz NOT NULL DEFAULT now()
   )`,
];

for (const statement of STATEMENTS) {
  await sql.query(statement);
  console.log("ok:", statement.split("\n")[0].trim());
}

console.log("\nDatabase ready.");
