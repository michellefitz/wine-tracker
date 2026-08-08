import { sql } from "@/lib/db";
import { RATINGS, SOURCES, TAGS, WINE_TYPES } from "@/lib/taxonomy";
import type { Wine, WineInput } from "@/lib/types";

const VALID_SCORES = new Set<number>(RATINGS.map((rating) => rating.score));
const VALID_TAGS = new Set(TAGS.map((tag) => tag.id));
const VALID_TYPES = new Set<string>(WINE_TYPES);
const VALID_SOURCES = new Set<string>(SOURCES);

export class ValidationError extends Error {}

function trimmed(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, max);
}

/**
 * Normalises whatever the client sent into something safe to store. Unknown
 * tags and out-of-vocabulary types are dropped rather than rejected, so a stale
 * client can't wedge itself on a taxonomy change.
 */
export function normalizeInput(body: unknown): Required<WineInput> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Expected a JSON object");
  }
  const input = body as Record<string, unknown>;

  const name = trimmed(input.name, 200);
  if (!name) throw new ValidationError("A wine name is required");

  const score = Number(input.score);
  if (!VALID_SCORES.has(score)) {
    throw new ValidationError("Pick how much you liked it");
  }

  let vintage: number | null = null;
  if (input.vintage !== null && input.vintage !== undefined && input.vintage !== "") {
    const year = Number(input.vintage);
    const thisYear = new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > thisYear + 1) {
      throw new ValidationError("Vintage should be a year between 1900 and now");
    }
    vintage = year;
  }

  let priceEur: number | null = null;
  if (input.price_eur !== null && input.price_eur !== undefined && input.price_eur !== "") {
    const price = Number(input.price_eur);
    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      throw new ValidationError("Price should be a number between 0 and 10000");
    }
    priceEur = Math.round(price * 100) / 100;
  }

  const grapes = Array.isArray(input.grapes)
    ? Array.from(
        new Set(
          input.grapes
            .map((grape) => trimmed(grape, 60))
            .filter((grape): grape is string => grape !== null),
        ),
      ).slice(0, 10)
    : [];

  const tags = Array.isArray(input.tags)
    ? Array.from(new Set(input.tags.filter((tag): tag is string => typeof tag === "string" && VALID_TAGS.has(tag))))
    : [];

  const wineType = trimmed(input.wine_type, 40);
  const source = trimmed(input.source, 60);

  let drankOn = new Date().toISOString().slice(0, 10);
  const suppliedDate = trimmed(input.drank_on, 10);
  if (suppliedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(suppliedDate) || Number.isNaN(Date.parse(suppliedDate))) {
      throw new ValidationError("Date should look like YYYY-MM-DD");
    }
    drankOn = suppliedDate;
  }

  return {
    producer: trimmed(input.producer, 200),
    name,
    vintage,
    region: trimmed(input.region, 120),
    country: trimmed(input.country, 80),
    grapes,
    wine_type: wineType && VALID_TYPES.has(wineType) ? wineType : null,
    score,
    tags,
    notes: trimmed(input.notes, 4000),
    price_eur: priceEur,
    source: source && VALID_SOURCES.has(source) ? source : null,
    photo_id: trimmed(input.photo_id, 40),
    drank_on: drankOn,
  };
}

const SELECT_COLUMNS = `
  id, producer, name, vintage, region, country,
  coalesce(grapes, '[]'::jsonb) as grapes,
  wine_type, score,
  coalesce(tags, '[]'::jsonb) as tags,
  notes, price_eur, source, photo_id,
  to_char(drank_on, 'YYYY-MM-DD') as drank_on,
  created_at
`;

function toWine(row: Record<string, unknown>): Wine {
  return {
    ...row,
    price_eur: row.price_eur === null ? null : Number(row.price_eur),
    grapes: (row.grapes as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    created_at: String(row.created_at),
  } as Wine;
}

export async function listWines(): Promise<Wine[]> {
  const db = sql();
  const rows = await db.query(
    `SELECT ${SELECT_COLUMNS} FROM wines ORDER BY drank_on DESC, created_at DESC`,
  );
  return (rows as Record<string, unknown>[]).map(toWine);
}

export async function getWine(id: string): Promise<Wine | null> {
  const db = sql();
  const rows = await db.query(`SELECT ${SELECT_COLUMNS} FROM wines WHERE id = $1`, [id]);
  const row = (rows as Record<string, unknown>[])[0];
  return row ? toWine(row) : null;
}

export async function createWine(input: Required<WineInput>): Promise<Wine> {
  const db = sql();
  const rows = await db.query(
    `INSERT INTO wines
       (producer, name, vintage, region, country, grapes, wine_type,
        score, tags, notes, price_eur, source, photo_id, drank_on)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.producer,
      input.name,
      input.vintage,
      input.region,
      input.country,
      JSON.stringify(input.grapes),
      input.wine_type,
      input.score,
      JSON.stringify(input.tags),
      input.notes,
      input.price_eur,
      input.source,
      input.photo_id,
      input.drank_on,
    ],
  );
  return toWine((rows as Record<string, unknown>[])[0]);
}

export async function updateWine(id: string, input: Required<WineInput>): Promise<Wine | null> {
  const db = sql();
  const rows = await db.query(
    `UPDATE wines SET
       producer = $2, name = $3, vintage = $4, region = $5, country = $6,
       grapes = $7::jsonb, wine_type = $8, score = $9, tags = $10::jsonb,
       notes = $11, price_eur = $12, source = $13, photo_id = $14, drank_on = $15
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.producer,
      input.name,
      input.vintage,
      input.region,
      input.country,
      JSON.stringify(input.grapes),
      input.wine_type,
      input.score,
      JSON.stringify(input.tags),
      input.notes,
      input.price_eur,
      input.source,
      input.photo_id,
      input.drank_on,
    ],
  );
  const row = (rows as Record<string, unknown>[])[0];
  return row ? toWine(row) : null;
}

export async function deleteWine(id: string): Promise<boolean> {
  const db = sql();
  const rows = await db.query(`DELETE FROM wines WHERE id = $1 RETURNING id`, [id]);
  return (rows as unknown[]).length > 0;
}
