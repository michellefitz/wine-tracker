#!/usr/bin/env node
/**
 * Writes the serving note for every bottle in the log that hasn't got one.
 *
 * Notes began life as one field of the web lookup, so bottles filed before
 * they existed have none, and pressing Refresh on those didn't help: the
 * lookup would happily rewrite everything except the section you were looking
 * at, because a failed note is silent and a bottle already at the current
 * version is never revisited. This walks the log and asks for each one
 * directly — two seconds a bottle, no searching.
 *
 * Runs against the deployed app, over its own API, as you: it logs in with the
 * passcode and keeps the cookie. Nothing here touches the database.
 *
 *   APP_URL=https://your-app.vercel.app APP_PASSCODE=... node scripts/backfill-serving.mjs
 *
 * Or with those in .env.local, just:
 *
 *   node scripts/backfill-serving.mjs
 *
 * Safe to re-run: bottles that already have a note are skipped unless you pass
 * --force, which rewrites every one of them.
 */
import { readFileSync } from "node:fs";

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

const force = process.argv.includes("--force");
const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const passcode = process.env.APP_PASSCODE;

if (!passcode) {
  console.error("APP_PASSCODE isn't set. Put it in .env.local or pass it on the command line.");
  process.exit(1);
}

/** The signed cookie the app hands back, carried by every request after it. */
async function signIn() {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`login failed (${response.status}): ${body.slice(0, 200)}`);
  }
  const cookie = response.headers.getSetCookie?.()[0] ?? response.headers.get("set-cookie");
  if (!cookie) throw new Error("logged in but got no cookie back");
  return cookie.split(";")[0];
}

async function main() {
  console.log(`${base}`);
  const cookie = await signIn();
  const headers = { cookie, "Content-Type": "application/json" };

  const listed = await fetch(`${base}/api/wines`, { headers });
  if (!listed.ok) throw new Error(`couldn't list wines (${listed.status})`);
  const { wines } = await listed.json();
  console.log(`${wines.length} bottle${wines.length === 1 ? "" : "s"} in the log\n`);

  let written = 0;
  let skipped = 0;
  const failed = [];

  for (const wine of wines) {
    const label = [wine.producer, wine.name].filter(Boolean).join(" ");

    if (!force) {
      const stored = await fetch(`${base}/api/wines/${wine.id}/facts`, { headers });
      const { facts } = stored.ok ? await stored.json() : { facts: null };
      if (facts?.serving) {
        skipped += 1;
        console.log(`  ·  ${label} — already has one`);
        continue;
      }
    }

    const response = await fetch(`${base}/api/wines/${wine.id}/serving`, {
      method: "POST",
      headers,
    });
    const body = await response.json().catch(() => ({}));

    if (body.serving) {
      written += 1;
      console.log(`  ✓  ${label} — ${body.serving.temperature}, ${body.serving.chill}`);
    } else {
      failed.push([label, body.reason ?? body.error ?? `HTTP ${response.status}`]);
      console.log(`  ✗  ${label} — ${body.reason ?? body.error ?? response.status}`);
    }
  }

  console.log(`\n${written} written, ${skipped} already had one, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log("\nThe ones that failed, and why:");
    for (const [label, reason] of failed) console.log(`  ${label}: ${reason}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
