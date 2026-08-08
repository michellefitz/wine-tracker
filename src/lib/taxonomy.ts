/**
 * The fixed vocabulary the app logs against.
 *
 * Everything here is stored by `id`, never by label, so labels can be reworded
 * later without rewriting history — and so a preference profile can be built by
 * counting ids across the wines you liked and disliked.
 */

/**
 * `liked` drives the visual treatment: wines you enjoyed carry the accent
 * colour, the rest go quiet grey — so a shelf of cards reads at a glance.
 * `solid` separates the emphatic ends of the scale from the mild ones.
 */
export const RATINGS = [
  { score: 2, id: "loved", label: "Loved it", short: "Loved", liked: true, solid: true },
  { score: 1, id: "liked", label: "Liked it", short: "Liked", liked: true, solid: false },
  { score: -1, id: "disliked", label: "Didn't like it", short: "Didn't like", liked: false, solid: false },
  { score: -2, id: "hated", label: "Really disliked it", short: "Disliked", liked: false, solid: true },
] as const;

export type RatingScore = (typeof RATINGS)[number]["score"];

export function ratingFor(score: number) {
  return RATINGS.find((rating) => rating.score === score);
}

export const WINE_TYPES = [
  "Red",
  "White",
  "Rosé",
  "Sparkling",
  "Orange",
  "Dessert",
  "Fortified",
] as const;

/** Where the bottle came from. Skewed to Irish supermarkets on purpose. */
export const SOURCES = [
  "Tesco",
  "Dunnes Stores",
  "SuperValu",
  "Lidl",
  "Aldi",
  "Marks & Spencer",
  "Centra / Spar",
  "Off-licence",
  "Wine shop",
  "Restaurant / bar",
  "Gift",
  "Other",
] as const;

export type TagGroup = "Sweetness" | "Body" | "Structure" | "Flavour" | "Finish" | "Overall";

export const TAG_GROUPS: TagGroup[] = [
  "Sweetness",
  "Body",
  "Structure",
  "Flavour",
  "Finish",
  "Overall",
];

export type Tag = { id: string; label: string; group: TagGroup };

export const TAGS: Tag[] = [
  { id: "too_sweet", label: "Too sweet", group: "Sweetness" },
  { id: "nicely_off_dry", label: "Nicely off-dry", group: "Sweetness" },
  { id: "too_dry", label: "Too dry", group: "Sweetness" },

  { id: "too_heavy", label: "Too heavy / rich", group: "Body" },
  { id: "full_bodied", label: "Full-bodied", group: "Body" },
  { id: "light_easy", label: "Light & easy", group: "Body" },
  { id: "too_thin", label: "Too thin / watery", group: "Body" },

  { id: "too_tannic", label: "Too tannic / harsh", group: "Structure" },
  { id: "smooth", label: "Smooth", group: "Structure" },
  { id: "too_acidic", label: "Too sharp", group: "Structure" },
  { id: "crisp", label: "Crisp & fresh", group: "Structure" },

  { id: "fruity", label: "Fruity", group: "Flavour" },
  { id: "jammy", label: "Jammy", group: "Flavour" },
  { id: "oaky", label: "Oaky / vanilla", group: "Flavour" },
  { id: "earthy", label: "Earthy / savoury", group: "Flavour" },
  { id: "spicy", label: "Spicy / peppery", group: "Flavour" },
  { id: "buttery", label: "Buttery", group: "Flavour" },
  { id: "mineral", label: "Mineral", group: "Flavour" },

  { id: "too_boozy", label: "Too boozy", group: "Finish" },
  { id: "bitter_finish", label: "Bitter finish", group: "Finish" },
  { id: "long_finish", label: "Long finish", group: "Finish" },

  { id: "easy_drinking", label: "Easy drinking", group: "Overall" },
  { id: "good_value", label: "Good value", group: "Overall" },
  { id: "overpriced", label: "Overpriced", group: "Overall" },
  { id: "buy_again", label: "Would buy again", group: "Overall" },
];

const TAGS_BY_ID = new Map(TAGS.map((tag) => [tag.id, tag]));

export function tagLabel(id: string): string {
  return TAGS_BY_ID.get(id)?.label ?? id;
}

export function tagsInGroup(group: TagGroup): Tag[] {
  return TAGS.filter((tag) => tag.group === group);
}
