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

/** A score somebody else gave this wine, kept as text so "91 points" survives. */
export type WineRating = {
  source: string;
  score: string;
  scale: string | null;
  count: string | null;
};

/**
 * What the web knows about one specific bottle — as opposed to what you thought
 * of it, which is the wine row itself.
 *
 * `found: false` is an ordinary outcome, not an error: plenty of supermarket
 * own-label bottles have no coverage anywhere, and that's worth recording so it
 * isn't looked up again on every visit.
 */
export type WineFacts = {
  wine_id: string;
  found: boolean;
  summary: string | null;
  style: string | null;
  /** Grapes the search found, used when the log doesn't name any. */
  grapes: string[];
  ratings: WineRating[];
  details: { label: string; value: string }[];
  awards: string[];
  food: string[];
  sources: { title: string; url: string }[];
  note: string | null;
};

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
