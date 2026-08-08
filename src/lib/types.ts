export type Wine = {
  id: string;
  producer: string | null;
  name: string;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grapes: string[];
  wine_type: string | null;
  score: number;
  tags: string[];
  notes: string | null;
  price_eur: number | null;
  source: string | null;
  photo_id: string | null;
  drank_on: string;
  created_at: string;
};

/** What the label-reading endpoint gives back. Every field can be null. */
export type LabelReading = {
  is_wine_label: boolean;
  producer: string | null;
  name: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grapes: string[];
  wine_type: string | null;
  confidence: "high" | "medium" | "low";
  note: string | null;
};

/** A place a grape is classically grown, and what it does differently there. */
export type GrapeRegion = {
  name: string;
  country: string | null;
  note: string | null;
};

/**
 * What we know about one grape variety. Written once by Claude and then cached
 * in Postgres — a grape doesn't change, so this is generated at most once per
 * variety per `PROFILE_VERSION`.
 *
 * The four scales are 1–5, or null when the axis doesn't apply (tannin on a
 * white). Everything else can be empty; nothing here is load-bearing.
 */
export type GrapeProfile = {
  slug: string;
  name: string;
  also_known_as: string[];
  colour: "red" | "white" | "other" | null;
  summary: string;
  acidity: number | null;
  body: number | null;
  tannin: number | null;
  sweetness: number | null;
  flavours: string[];
  regions: GrapeRegion[];
  pairings: string[];
  similar: string[];
  facts: string[];
};

/**
 * The three ways looking a grape up can end. `unknown` is cached too, so typing
 * "blend" into the grapes field costs one API call ever, not one per visit.
 */
export type GrapeLookup =
  | { status: "ok"; profile: GrapeProfile; warning: string | null }
  | { status: "unknown"; note: string | null }
  | { status: "unavailable"; message: string };

/** Body accepted by POST/PATCH on the wines endpoints. */
export type WineInput = {
  producer?: string | null;
  name: string;
  vintage?: number | null;
  region?: string | null;
  country?: string | null;
  grapes?: string[];
  wine_type?: string | null;
  score: number;
  tags?: string[];
  notes?: string | null;
  price_eur?: number | null;
  source?: string | null;
  photo_id?: string | null;
  drank_on?: string | null;
};
