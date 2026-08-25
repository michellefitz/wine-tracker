import { flatten } from "@/lib/text";

/**
 * How to serve what's in the bottle.
 *
 * Deliberately not a web lookup. "How cold should a Prosecco be" has the same
 * answer for every Prosecco ever made, so searching for it per bottle would be
 * paying twenty seconds for something already known — and it would leave the
 * advice missing on exactly the bottles the search comes up short on. This
 * renders instantly, offline, for every wine in the log.
 *
 * The one thing worth taking from the web is a producer's own stated serving
 * temperature, since they occasionally disagree with the convention for good
 * reasons. `servingFor` takes it and prefers it when it's there.
 *
 * Temperatures are the conventional ranges. The practical line under each is
 * the part people actually need: nobody owns a wine thermometer, but everyone
 * owns a fridge and a clock.
 */

export type Serving = {
  /** The bucket this fell into — "Light red", "Sparkling", and so on. */
  style: string;
  temperature: string;
  /** How to get there with a fridge and a clock. */
  chill: string;
  glass: string;
  air: string;
};

/** Reds that want to be cool and drunk young, not warmed and decanted. */
const LIGHT_REDS = [
  "pinot noir", "gamay", "frappato", "schiava", "trousseau", "poulsard",
  "cinsault", "zweigelt", "blaufrankisch", "st laurent", "bonarda", "grignolino",
  "cesanese", "pineau d aunis", "mondeuse",
];

/** Reds with enough tannin that air genuinely changes them. */
const FIRM_REDS = [
  "nebbiolo", "cabernet sauvignon", "syrah", "shiraz", "tannat", "sagrantino",
  "aglianico", "malbec", "tempranillo", "monastrell", "mourvedre", "petit verdot",
  "touriga nacional", "xinomavro", "carmenere", "bordeaux blend", "cabernet franc",
];

/** Whites that are about aroma and acid, and want a proper chill. */
const CRISP_WHITES = [
  "sauvignon blanc", "riesling", "albarino", "gruner veltliner", "verdejo",
  "picpoul", "assyrtiko", "vermentino", "muscadet", "melon de bourgogne",
  "loureiro", "arinto", "trajadura", "pedernã", "pederna", "glera", "cortese",
  "pinot grigio", "pinot gris", "chenin blanc", "torrontes",
];

/** Whites with body or oak, which fridge-cold flattens completely. */
const RICH_WHITES = [
  "chardonnay", "viognier", "marsanne", "roussanne", "semillon", "fiano",
  "godello", "verdicchio", "grenache blanc", "white rioja",
];

function has(grapes: string[], list: string[]): boolean {
  const flat = grapes.map(flatten);
  return flat.some((grape) => list.some((entry) => grape.includes(entry)));
}

const GLASS = {
  big: "A big bowl, filled barely a third. The empty space is what collects the smell — a full glass has nowhere to hold it.",
  wide: "The widest bowl you own, filled a third. Delicate reds need the surface area more than they need the height.",
  white: "A smaller bowl than a red glass, and still only a third full. Keeps it cold and pointed at your nose.",
  tulip: "A tulip rather than a flute or a coupe. A flute hides the smell to show off the bubbles; a coupe loses both.",
  small: "A small glass and a small pour — it's strong and sweet, and a big measure of it goes tiring.",
};

/**
 * What this bottle wants, from what's on the label.
 *
 * `statedTemperature` is the producer's own, when the lookup found one; it wins
 * over the convention, because they know their wine.
 */
export function servingFor(
  wineType: string | null,
  grapes: string[] = [],
  statedTemperature?: string | null,
): Serving | null {
  const type = flatten(wineType ?? "");
  if (!type) return null;

  const serving = advice(type, grapes);
  if (!serving) return null;

  const stated = statedTemperature?.trim();
  return stated ? { ...serving, temperature: stated, chill: `${serving.chill} The producer says ${stated}.` } : serving;
}

function advice(type: string, grapes: string[]): Serving | null {
  if (type === "sparkling") {
    return {
      style: "Sparkling",
      temperature: "6–8 °C",
      chill: "Properly cold: three hours in the fridge, or twenty minutes in a bucket of ice and water, which is faster than a freezer and won't forget about it.",
      glass: GLASS.tulip,
      air: "Don't swirl it — you're pouring the bubbles away. Pour down the side of the glass rather than into the middle, and it keeps its fizz.",
    };
  }

  if (type === "dessert") {
    return {
      style: "Dessert",
      temperature: "8–10 °C",
      chill: "A couple of hours in the fridge. Cold keeps the sweetness from turning cloying, but ice-cold flattens the fruit.",
      glass: GLASS.small,
      air: "A gentle swirl. It's already concentrated; it doesn't need opening up.",
    };
  }

  if (type === "fortified") {
    return {
      style: "Fortified",
      temperature: "12–16 °C, or 8–10 °C for a dry sherry",
      chill: "Twenty minutes in the fridge for port or madeira. Fino and manzanilla are white wines in all but name — serve them properly cold.",
      glass: GLASS.small,
      air: "Fine open on the side for days, unlike everything else here. A tawny or an oloroso will still be good next week.",
    };
  }

  if (type === "rose") {
    return {
      style: "Rosé",
      temperature: "8–10 °C",
      chill: "Two hours in the fridge, then out of it while you pour. Straight from the door of the fridge is a little too cold.",
      glass: GLASS.white,
      air: "A swirl is plenty. Drink it young and cold.",
    };
  }

  if (type === "orange") {
    return {
      style: "Orange",
      temperature: "12–14 °C",
      chill: "Cooler than a red, warmer than a white — about half an hour in the fridge, no more. Cold makes the skin tannins taste bitter.",
      glass: GLASS.big,
      air: "Treat it like a light red: swirl it, and give it half an hour open. Most of them change more in the glass than whites do.",
    };
  }

  if (type === "white") {
    if (has(grapes, RICH_WHITES)) {
      return {
        style: "Fuller white",
        temperature: "10–13 °C",
        chill: "Out of the fridge twenty minutes before you pour. Fridge-cold hides everything that makes this style worth the money.",
        glass: GLASS.big,
        air: "Swirl it, and don't rush the first glass — these open up over half an hour like a red does.",
      };
    }
    return {
      style: "Crisp white",
      temperature: "8–10 °C",
      chill: "Two to three hours in the fridge. Take it out ten minutes before pouring — the aromatics shut down when it's colder than that.",
      glass: GLASS.white,
      air: "A swirl to wake it up. No decanting.",
    };
  }

  if (type === "red") {
    if (has(grapes, LIGHT_REDS)) {
      return {
        style: "Light red",
        temperature: "12–14 °C",
        chill: "Yes, chilled — half an hour in the fridge before you open it. Served warm these go flat and jammy, which is why so many people think they don't like them.",
        glass: GLASS.wide,
        air: "Swirl it. No decanting: there's little tannin to soften and you'd blow off the perfume, which is the whole point.",
      };
    }
    if (has(grapes, FIRM_REDS)) {
      return {
        style: "Firm red",
        temperature: "16–18 °C",
        chill: "\"Room temperature\" means a stone-floored cellar, not a heated room. Twenty minutes in the fridge before pouring is usually right.",
        glass: GLASS.big,
        air: "Worth decanting — thirty to sixty minutes if it's young, and pour it roughly to get air into it. If you've no decanter, a jug and back into the bottle does the same job.",
      };
    }
    return {
      style: "Red",
      temperature: "15–17 °C",
      chill: "Fifteen to twenty minutes in the fridge before pouring, unless the room is cold. Most reds are served too warm.",
      glass: GLASS.big,
      air: "Swirl it and give it twenty minutes in the glass. Decant only if it tastes tight or tannic when you first pour it.",
    };
  }

  return null;
}
