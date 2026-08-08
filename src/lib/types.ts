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
