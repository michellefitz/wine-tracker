#!/usr/bin/env node
/**
 * Creates (or brings up to date) the tables the app needs.
 * Safe to run repeatedly.
 *
 *   DATABASE_URL=... npm run db:init
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { STATEMENTS } from "../src/lib/schema.mjs";

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

for (const statement of STATEMENTS) {
  await sql.query(statement);
  console.log("ok:", statement.split("\n")[0].trim());
}

console.log("\nDatabase ready.");
