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
/**
 * The verdicts, and the absence of one.
 *
 * Zero is "not opened yet", and it is a real answer rather than a missing one:
 * you can buy a bottle, or be standing in front of one in a shop, and want
 * everything the app knows about it without pretending to an opinion you
 * haven't earned. It sits last because the other four are the common case, and
 * it is deliberately still a choice you have to make — a bottle in the log
 * with nothing said about it at all is how a log stops being trustworthy.
 *
 * Zero was free: the scale has always run -2, -1, 1, 2, with nothing in the
 * middle. Everything that reads a rating reads it from this list, so a fifth
 * entry reaches validation, the form, the cards, the map and the grape pages
 * without any of them being told.
 */
export const RATINGS = [
  { score: 2, id: "loved", label: "Loved it", short: "Loved", liked: true, solid: true },
  { score: 1, id: "liked", label: "Liked it", short: "Liked", liked: true, solid: false },
  { score: -1, id: "disliked", label: "Didn't like it", short: "Didn't like", liked: false, solid: false },
  { score: -2, id: "hated", label: "Really disliked it", short: "Disliked", liked: false, solid: true },
  { score: 0, id: "unopened", label: "Not opened yet", short: "Unopened", liked: false, solid: false },
] as const;

/** A bottle you have but haven't drunk. */
export function isUnopened(score: number): boolean {
  return score === 0;
}

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

/**
 * Where the bottle came from. Skewed to Irish shops on purpose — supermarkets
 * first, then the wine merchants worth naming, then the catch-alls for
 * everywhere else.
 */
export const SOURCES = [
  "Tesco",
  "Dunnes Stores",
  "SuperValu",
  "Lidl",
  "Aldi",
  "Marks & Spencer",
  "Centra / Spar",
  "O'Briens",
  "Mitchell & Son",
  "Ely",
  "Off-licence",
  "Wine shop",
  "Restaurant / bar",
  "Gift",
  "Other",
] as const;

/**
 * The four axes every grape is described on, so two grapes can be compared by
 * looking rather than reading. Each is a 1–5 integer; `levels` turns the number
 * into the word a person would actually say ("high acidity", "medium body").
 *
 * `hint` is the reason this feature exists: a scale you can't interpret teaches
 * nothing, so each axis says in plain language what it feels like in the mouth.
 */
export const GRAPE_SCALES = [
  {
    id: "acidity",
    label: "Acidity",
    levels: ["Low", "Soft", "Medium", "Fresh", "High"],
    hint: "How much it makes your mouth water. High acidity tastes crisp and cuts through food; low acidity tastes round and soft.",
  },
  {
    id: "body",
    label: "Body",
    levels: ["Very light", "Light", "Medium", "Full", "Very full"],
    hint: "How much it fills your mouth — roughly the difference between skimmed milk and cream.",
  },
  {
    id: "tannin",
    label: "Tannin",
    levels: ["None", "Light", "Medium", "Firm", "Grippy"],
    hint: "The drying grip on your gums, from the grape skins. Reds have it; whites almost never do.",
  },
  {
    id: "sweetness",
    label: "Sweetness",
    levels: ["Bone dry", "Dry", "Off-dry", "Sweet", "Very sweet"],
    hint: "Nearly everything on a supermarket shelf is dry — the yeast ate all the sugar.",
  },
] as const;

export type GrapeScale = (typeof GRAPE_SCALES)[number];
export type GrapeScaleId = GrapeScale["id"];

/** The word for a level, or null when the axis doesn't apply to this grape. */
export function scaleLevelWord(scale: GrapeScale, value: number | null): string | null {
  if (value === null || !Number.isInteger(value) || value < 1 || value > 5) return null;
  return scale.levels[value - 1];
}

/**
 * What each end of an axis means, for printing under it.
 *
 * Taken from the levels rather than written separately. These scales used to
 * carry their own pair of end words — acidity ran "Soft" to "Zippy" while its
 * levels ran Low to High — and neither was ever drawn, so a grape read
 * "Acidity: Fresh" with nothing to measure Fresh against. Two vocabularies for
 * one axis is one more than it needs; the ends are simply its first and last
 * words now, and can't drift from the value sitting between them.
 */
export function scaleEnds(scale: GrapeScale): [string, string] {
  return [scale.levels[0], scale.levels[scale.levels.length - 1]];
}

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
