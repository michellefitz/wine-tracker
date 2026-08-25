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
 * Three layers, each narrowing the one above:
 *
 *   1. The type gets you a bucket. Sparkling is cold and doesn't get swirled.
 *   2. The grapes split the bucket where the type is too coarse to serve by —
 *      a Pinot Noir and a Nebbiolo are both "Red" and want four degrees and
 *      opposite advice on decanting.
 *   3. A named grape or bottle style overrides individual lines. This is where
 *      Nebbiolo stops being "a firm red" and starts being Nebbiolo, and where
 *      a Champagne stops being "a sparkling" and starts being a Champagne.
 *
 * Layer 3 reads the label as well as the grapes, because the thing that most
 * changes how you serve a sparkling wine — how it was made — is never in the
 * grape list. Glera tells you it's a Prosecco; nothing in "Chardonnay, Pinot
 * Noir" tells you whether it spent three years on its lees.
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
  /** What this turned out to be — "Nebbiolo", "Champagne & crémant", "Red". */
  style: string;
  temperature: string;
  /** How to get there with a fridge and a clock. */
  chill: string;
  glass: string;
  air: string;
};

/** The buckets a wine type falls into. Narrower than the type list on purpose. */
type Kind = "red" | "white" | "sparkling" | "rose" | "orange" | "dessert" | "fortified";

const KIND_BY_TYPE: Record<string, Kind> = {
  red: "red",
  white: "white",
  sparkling: "sparkling",
  rose: "rose",
  orange: "orange",
  dessert: "dessert",
  fortified: "fortified",
};

/* ---------------------------------------------------------------- matching */

/**
 * Whether any of these terms appears in any of these phrases, as whole words.
 *
 * Word-wise rather than substring, which matters more than it sounds: the
 * producer Cavalchina contains "cava", and Blanc de Noirs contains "noir".
 * Everything here has been through `flatten`, so words are single-spaced and
 * padding both sides is enough to anchor them.
 */
function mentions(phrases: string[], terms: string[]): boolean {
  return phrases.some((phrase) => {
    const padded = ` ${phrase} `;
    return terms.some((term) => padded.includes(` ${term} `));
  });
}

/* ------------------------------------------------------------ the glasses */

const GLASS = {
  big: "A big bowl, filled barely a third. The empty space is what collects the smell — a full glass has nowhere to hold it.",
  wide: "The widest bowl you own, filled a third. Delicate reds need the surface area more than they need the height.",
  tall: "The taller, narrower shape if you have both — it aims a tannic wine past the front of your tongue. Still only a third full.",
  white: "A smaller bowl than a red glass, and still only a third full. Keeps it cold and pointed at your nose.",
  fatWhite: "A bigger bowl than you'd normally give a white — closer to a red glass. This is a wine with texture, and it needs the room.",
  tulip: "A tulip rather than a flute or a coupe. A flute hides the smell to show off the bubbles; a coupe loses both.",
  small: "A small glass and a small pour — it's strong and sweet, and a big measure of it goes tiring.",
};

/* --------------------------------------------------------- layer 2: grapes */

/** Reds that want to be cool and drunk young, not warmed and decanted. */
const LIGHT_REDS = [
  "pinot noir", "gamay", "frappato", "schiava", "trousseau", "poulsard",
  "cinsault", "zweigelt", "blaufrankisch", "st laurent", "bonarda", "grignolino",
  "cesanese", "pineau d aunis", "mondeuse", "mencia", "nerello mascalese",
  "dolcetto", "barbera", "lagrein", "vespolina", "pelaverga",
];

/** Reds with enough tannin that air genuinely changes them. */
const FIRM_REDS = [
  "nebbiolo", "cabernet sauvignon", "syrah", "shiraz", "tannat", "sagrantino",
  "aglianico", "malbec", "tempranillo", "monastrell", "mourvedre", "petit verdot",
  "touriga nacional", "xinomavro", "carmenere", "bordeaux blend", "cabernet franc",
  "nero d avola", "montepulciano", "petite sirah", "pinotage",
];

/** Whites that are about aroma and acid, and want a proper chill. */
const CRISP_WHITES = [
  "sauvignon blanc", "riesling", "albarino", "gruner veltliner", "verdejo",
  "picpoul", "assyrtiko", "vermentino", "muscadet", "melon de bourgogne",
  "loureiro", "arinto", "trajadura", "pederna", "glera", "cortese",
  "pinot grigio", "pinot gris", "chenin blanc", "torrontes", "silvaner",
  "aligote", "furmint", "garganega", "falanghina",
];

/** Whites with body or oak, which fridge-cold flattens completely. */
const RICH_WHITES = [
  "chardonnay", "viognier", "marsanne", "roussanne", "semillon", "fiano",
  "godello", "verdicchio", "grenache blanc", "white rioja", "gewurztraminer",
];

/* ---------------------------------------------- layer 3: named refinements */

type Refinement = {
  /** Which buckets this can apply to. Keeps Grenache Blanc out of the reds. */
  kinds: Kind[];
  /** Grape names or label words that trigger it, whole-word. */
  when: string[];
  serving: Partial<Serving> & { style: string };
};

/**
 * Ordered: the first match wins, so the specific sits above the general —
 * Amarone before Corvina, pét-nat before everything else with bubbles.
 */
const REFINEMENTS: Refinement[] = [
  /* ------------------------------------------------------------ sparkling */
  {
    kinds: ["sparkling", "white", "orange", "rose"],
    when: ["pet nat", "petnat", "pétnat", "ancestral", "ancestrale", "col fondo", "sur lie"],
    serving: {
      style: "Pét-nat",
      temperature: "8–10 °C",
      chill: "Two to three hours in the fridge, standing upright so the sediment falls to the bottom. Not as cold as a Prosecco — there's usually more flavour here, and cold hides it.",
      glass: GLASS.tulip,
      air: "Open it over the sink. These are bottled while still fermenting and the pressure varies bottle to bottle, so ease the cap off slowly and be ready for it to climb. Then decide about the cloudy last inch: in some it's the best part, in others it's just muddy — pour it into a spare glass and taste before you commit.",
    },
  },
  {
    kinds: ["sparkling", "red"],
    when: ["lambrusco"],
    serving: {
      style: "Lambrusco",
      temperature: "12–14 °C",
      chill: "Chilled but not cold — an hour in the fridge. It's a red wine with bubbles, and fridge-cold turns the tannin hard and bitter.",
      glass: GLASS.tulip,
      air: "Don't swirl. Pour down the side of the glass, and drink it with something fatty — it was built for salami and parmesan, not for sipping on its own.",
    },
  },
  {
    kinds: ["sparkling", "dessert", "white"],
    when: ["asti", "moscato d asti", "moscato"],
    serving: {
      style: "Moscato",
      temperature: "6–8 °C",
      chill: "Very cold, three hours in the fridge, and keep the bottle in ice while you drink it. It's low in alcohol and entirely about the grapey, floral top note, which goes soapy as it warms.",
      glass: GLASS.small,
      air: "Nothing to do but pour it. Drink it young — this is one of the few wines that is genuinely worse every year it sits.",
    },
  },
  {
    kinds: ["sparkling"],
    when: ["prosecco", "glera", "valdobbiadene", "conegliano"],
    serving: {
      style: "Prosecco",
      temperature: "6–8 °C",
      chill: "Properly cold: three hours in the fridge, or twenty minutes in a bucket of ice and water, which is faster than a freezer and won't forget about it.",
      glass: GLASS.tulip,
      air: "Don't swirl it — you're pouring the bubbles away. Pour down the side of the glass rather than into the middle, and it keeps its fizz. Drink it the day you open it.",
    },
  },
  {
    kinds: ["sparkling"],
    when: [
      "champagne", "cremant", "franciacorta", "trentodoc", "cava", "metodo classico",
      "traditional method", "blanc de blancs", "blanc de noirs", "grower champagne",
      "chardonnay", "pinot noir", "pinot meunier", "meunier", "macabeo", "xarel lo",
      "parellada", "pinot nero",
    ],
    serving: {
      style: "Champagne & traditional method",
      temperature: "8–10 °C",
      chill: "Three hours in the fridge, then out of it ten minutes before you pour. Ice-cold mutes the bready, nutty side that the years on lees put there — which is the part you paid for.",
      glass: "A white-wine glass or a tulip, and never a flute. The bubbles look after themselves; it's the smell that needs a bowl to sit in.",
      air: "Pour down the side of the glass and don't swirl hard. Anything with age or a vintage on it is worth pouring twenty minutes before you drink it — a good Champagne opens up like a white burgundy, and the first mouthful is the least interesting one.",
    },
  },

  /* ----------------------------------------------------------------- reds */
  {
    kinds: ["red"],
    when: ["nebbiolo", "barolo", "barbaresco", "langhe", "spanna", "ghemme", "gattinara"],
    serving: {
      style: "Nebbiolo",
      temperature: "16–18 °C",
      chill: "Twenty minutes in the fridge before pouring, unless the room is genuinely cool. Nebbiolo is high in both acid and alcohol, and warmth makes the alcohol the first thing you meet.",
      glass: "The widest bowl you own — a Burgundy shape, not the tall Bordeaux one. Nebbiolo is pale and enormously perfumed, and it wants surface area far more than height.",
      air: "This needs more air than almost anything else you'll open. A young Barolo or Barbaresco is worth an hour or two in a decanter, poured roughly to knock air into it. An older one is the opposite — fragile, decanted only to leave the sediment behind, and drunk within the hour before the perfume goes.",
    },
  },
  {
    kinds: ["red"],
    when: ["pinot noir", "spatburgunder", "pinot nero", "bourgogne", "gevrey", "volnay"],
    serving: {
      style: "Pinot Noir",
      temperature: "12–14 °C",
      chill: "Half an hour in the fridge before you open it. Served at modern room temperature it goes soupy and sweet — this is the grape people most often decide they don't like on the strength of a warm glass.",
      glass: GLASS.wide,
      air: "Swirl it, and give it twenty minutes in the glass rather than a decanter. There's little tannin here to soften, and decanting blows off the perfume, which is the whole reason to drink Pinot.",
    },
  },
  {
    kinds: ["red"],
    when: ["gamay", "beaujolais", "morgon", "fleurie", "brouilly", "moulin a vent"],
    serving: {
      style: "Gamay",
      temperature: "12–13 °C",
      chill: "Forty minutes in the fridge, and no apology for it. Gamay is the wine most often ruined by being served warm: cold it's crunchy and bright, warm it's flat and jammy.",
      glass: GLASS.wide,
      air: "A swirl and no more. The cru bottlings — Morgon, Moulin-à-Vent — do have tannin and can take half an hour open, but nothing here needs a decanter.",
    },
  },
  {
    kinds: ["red"],
    when: ["syrah", "shiraz", "cote rotie", "hermitage", "cornas", "crozes hermitage", "saint joseph"],
    serving: {
      style: "Syrah",
      temperature: "15–17 °C",
      chill: "Twenty minutes in the fridge. Northern Rhône Syrah shows its pepper, olive and violet at the cool end and loses all three when it's warm; a ripe Australian Shiraz can take a degree or two more.",
      glass: GLASS.big,
      air: "Decant a young one for half an hour to an hour. Syrah goes through a closed, sullen phase for the first few years, and air is most of the answer.",
    },
  },
  {
    kinds: ["red"],
    when: [
      "grenache", "garnacha", "zinfandel", "primitivo", "chateauneuf du pape",
      "gigondas", "vacqueyras", "priorat", "amarone",
    ],
    serving: {
      style: "Warm-climate red",
      temperature: "14–16 °C",
      chill: "Cooler than instinct says — half an hour in the fridge. These run to 15% alcohol and warmth makes that the first and last thing you taste. Cold keeps the fruit in front of the spirit.",
      glass: GLASS.big,
      air: "Worth an hour in a decanter, and worth small pours: the glass warms in your hand faster than you'd think, so refill rather than fill.",
    },
  },
  {
    kinds: ["red"],
    when: [
      "cabernet sauvignon", "bordeaux blend", "claret", "pauillac", "margaux",
      "saint estephe", "saint julien", "medoc",
    ],
    serving: {
      style: "Cabernet & Bordeaux",
      temperature: "16–18 °C",
      chill: "\"Room temperature\" was set in unheated stone houses, not in a modern living room. Twenty minutes in the fridge before pouring is usually right.",
      glass: GLASS.tall,
      air: "Decant a young one for a full hour, and pour it roughly — Cabernet tannin is what air is for. Anything over fifteen years old should be stood upright a day ahead and decanted gently off its sediment just before you drink it.",
    },
  },
  {
    kinds: ["red"],
    when: ["cabernet franc", "chinon", "bourgueil", "saumur", "anjou rouge"],
    serving: {
      style: "Cabernet Franc",
      temperature: "14–16 °C",
      chill: "Half an hour in the fridge. Loire Cabernet Franc is a chillable red in all but reputation, and the graphite-and-raspberry side only shows when it's cool.",
      glass: GLASS.big,
      air: "Swirl it and give it twenty minutes. Decant only a young, tight one — and if it smells green when you first pour it, that usually blows off in the glass.",
    },
  },
  {
    kinds: ["red"],
    when: ["sangiovese", "chianti", "brunello", "rosso di montalcino", "vino nobile", "morellino"],
    serving: {
      style: "Sangiovese",
      temperature: "15–17 °C",
      chill: "Fifteen to twenty minutes in the fridge. Sangiovese is built on acid and savoury tannin, and warmth flattens the acid, which is what makes it work at the table.",
      glass: GLASS.big,
      air: "Decant a young Chianti Classico or Brunello for an hour. This is a wine that wants food more than it wants air, though — it can taste austere on its own and completely right next to something with fat and salt.",
    },
  },
  {
    kinds: ["red"],
    when: ["tempranillo", "rioja", "ribera del duero", "toro", "tinto fino"],
    serving: {
      style: "Tempranillo",
      temperature: "16–17 °C",
      chill: "Fifteen minutes in the fridge before pouring.",
      glass: GLASS.big,
      air: "Depends what you've got. A Reserva or Gran Reserva spent years in barrel and bottle being softened for you, so it needs very little — half an hour at most, and an old one should be decanted off its sediment and drunk. A young crianza or a modern Ribera is worth a full hour.",
    },
  },
  {
    kinds: ["red"],
    when: ["aglianico", "sagrantino", "tannat", "xinomavro", "taurasi", "madiran", "montefalco"],
    serving: {
      style: "Tannic red",
      temperature: "16–18 °C",
      chill: "Twenty minutes in the fridge. These are among the most tannic reds made, and heat makes tannin taste like drying-up cloth.",
      glass: GLASS.tall,
      air: "Two hours in a decanter is not too much for a young one, and it will still be improving the next day. Drink it with food — fat and protein soften tannin in the mouth far faster than air does in the bottle.",
    },
  },
  {
    kinds: ["red"],
    when: ["malbec", "mendoza", "cahors"],
    serving: {
      style: "Malbec",
      temperature: "15–17 °C",
      chill: "Twenty minutes in the fridge. Argentine Malbec is ripe and high in alcohol; a little cool keeps it from tasting sweet.",
      glass: GLASS.big,
      air: "Thirty to sixty minutes in a decanter. Cahors — the same grape, grown cool and dark in France — is firmer and takes longer.",
    },
  },
  {
    kinds: ["red"],
    when: ["mencia", "nerello mascalese", "etna rosso", "bierzo", "ribeira sacra", "frappato"],
    serving: {
      style: "Light mountain red",
      temperature: "13–15 °C",
      chill: "Forty minutes in the fridge. These are pale, high-acid, volcanic-tasting reds that behave more like Pinot Noir than like anything grown at sea level, and they need the chill for the same reason.",
      glass: GLASS.wide,
      air: "Swirl it; half an hour open at most. Decanting costs you the smell and buys you nothing.",
    },
  },
  {
    kinds: ["red"],
    when: ["barbera", "dolcetto", "grignolino", "schiava", "zweigelt", "trousseau", "poulsard"],
    serving: {
      style: "Everyday light red",
      temperature: "13–15 °C",
      chill: "Half an hour in the fridge. Lots of acid, little tannin — cold suits it, and it's the reason these are so good with a plate of food and no occasion.",
      glass: GLASS.wide,
      air: "A swirl. No decanting: there's nothing to soften.",
    },
  },

  /* --------------------------------------------------------------- whites */
  {
    kinds: ["white"],
    when: ["riesling", "kabinett", "spatlese", "auslese", "mosel", "rheingau", "clare valley"],
    serving: {
      style: "Riesling",
      temperature: "9–11 °C",
      chill: "Two hours in the fridge, then ten minutes out of it. A dry Riesling — Alsace, Austria, Clare Valley — is best at the warm end, where the lime and the stony bitterness show. An off-dry or sweet one wants a couple of degrees colder, because cold is what keeps sugar tasting like fruit instead of syrup.",
      glass: GLASS.white,
      air: "No decanting, but don't judge the first glass. Riesling shuts down fridge-cold and opens as it warms in the glass — the third mouthful is a different wine from the first, and better.",
    },
  },
  {
    kinds: ["white"],
    when: ["chardonnay", "chablis", "meursault", "puligny", "chassagne", "macon", "pouilly fuisse", "montrachet"],
    serving: {
      style: "Chardonnay",
      temperature: "10–13 °C",
      chill: "Depends which end of the grape. Unoaked and steely — Chablis, Mâcon — is happiest at 10 °C. Anything oaked or aged on its lees wants 12–13 °C, twenty minutes out of the fridge, where the texture and the hazelnut come through. Fridge-cold hides exactly what you paid extra for.",
      glass: GLASS.big,
      air: "Swirl it and don't rush the first glass; these open over half an hour the way a red does. A serious white burgundy is genuinely worth decanting, which sounds like a affectation and isn't.",
    },
  },
  {
    kinds: ["white"],
    when: ["gruner veltliner", "gruner", "wachau", "kamptal", "kremstal"],
    serving: {
      style: "Grüner Veltliner",
      temperature: "9–11 °C",
      chill: "Two hours in the fridge and ten minutes out. Too cold and you get only the acid; a little warmth is what brings up the white pepper and the lentil-y, savoury middle.",
      glass: GLASS.fatWhite,
      air: "A swirl. The bigger, riper Smaragd bottlings can take half an hour open — they behave more like a white burgundy than like a summer white.",
    },
  },
  {
    kinds: ["white"],
    when: [
      "albarino", "loureiro", "arinto", "trajadura", "pederna", "vinho verde",
      "rias baixas", "muscadet", "melon de bourgogne", "picpoul", "vermentino",
    ],
    serving: {
      style: "Atlantic white",
      temperature: "8–10 °C",
      chill: "Straight out of the fridge after two or three hours, and back in it between pours. This is the one family of whites that suffers more from being slightly too warm than slightly too cold — salt and acid are the point, and both need the chill.",
      glass: GLASS.white,
      air: "Nothing. Open it and drink it, ideally within a day and ideally with something out of the sea.",
    },
  },
  {
    kinds: ["white"],
    when: ["assyrtiko", "santorini"],
    serving: {
      style: "Assyrtiko",
      temperature: "10–12 °C",
      chill: "Two hours in the fridge, then fifteen minutes out. Assyrtiko is far fuller and more structured than its pale colour suggests, and serving it ice-cold wastes it.",
      glass: GLASS.fatWhite,
      air: "A swirl, and give it ten minutes. An oak-aged or older one behaves like a white burgundy and rewards the wait.",
    },
  },
  {
    kinds: ["white", "orange"],
    when: ["viognier", "gewurztraminer", "torrontes", "muscat", "condrieu", "malvasia", "moscatel"],
    serving: {
      style: "Aromatic white",
      temperature: "10–12 °C",
      chill: "An hour and a half in the fridge, no more. These wines are bought entirely for their smell — apricot, rose, lychee — and below about 9 °C the smell simply doesn't arrive.",
      glass: GLASS.big,
      air: "Swirl it properly; there's a lot to release. They're often slightly bitter on the finish, which is normal and which food fixes.",
    },
  },
  {
    kinds: ["white"],
    when: ["chenin blanc", "vouvray", "savennieres", "montlouis", "steen"],
    serving: {
      style: "Chenin Blanc",
      temperature: "10–12 °C",
      chill: "An hour and a half in the fridge. Chenin runs from bone dry to very sweet under near-identical labels — the sweeter it tastes, the colder it wants; a dry Savennières is best barely chilled.",
      glass: GLASS.fatWhite,
      air: "Give it time. Chenin is famously closed and sometimes faintly woolly when first poured, and half an hour in the glass usually sorts it out.",
    },
  },
  {
    kinds: ["white"],
    when: ["sauvignon blanc", "sancerre", "pouilly fume", "marlborough", "menetou salon"],
    serving: {
      style: "Sauvignon Blanc",
      temperature: "8–10 °C",
      chill: "Two to three hours in the fridge, out ten minutes before pouring. Cold keeps it crisp; too cold and the gooseberry and elderflower shut off entirely.",
      glass: GLASS.white,
      air: "A swirl to wake it up. A Sancerre with a few years on it takes a degree or two warmer than a young Marlborough — it turns flinty and smoky, and that needs a little heat to show.",
    },
  },
  {
    kinds: ["white"],
    when: ["pinot grigio", "pinot gris", "alsace"],
    serving: {
      style: "Pinot Gris",
      temperature: "9–11 °C",
      chill: "Two hours in the fridge. The same grape does two different jobs: a light Italian Grigio wants the cold end, an Alsace Pinot Gris is rich and often off-dry and wants the warm end and a bigger glass.",
      glass: GLASS.white,
      air: "A swirl. Nothing else needed.",
    },
  },

  /* ------------------------------------------------------------- fortified */
  {
    kinds: ["fortified", "white"],
    when: ["fino", "manzanilla", "sherry", "jerez", "en rama"],
    serving: {
      style: "Fino & manzanilla",
      temperature: "7–9 °C",
      chill: "Properly cold, three hours in the fridge, and served in a bucket if it's warm out. These are white wines in everything but the fortification, and everyone who says they dislike sherry has been given it warm.",
      glass: GLASS.white,
      air: "Buy the smallest bottle you can and treat it as an open white wine, not a spirit: it's alive under that layer of flor yeast and it goes tired within a week of opening. Half-bottles exist for a reason.",
    },
  },
  {
    kinds: ["fortified"],
    when: ["oloroso", "amontillado", "palo cortado", "pedro ximenez", "px"],
    serving: {
      style: "Aged sherry",
      temperature: "12–14 °C",
      chill: "Twenty minutes in the fridge — cellar-cool rather than cold. These are oxidative wines: they were made in contact with air, so the chill is about comfort, not preservation.",
      glass: GLASS.small,
      air: "Nothing to fear. An oloroso or amontillado will be perfectly good a month after opening, which makes a bottle far better value than the price suggests.",
    },
  },
  {
    kinds: ["fortified"],
    when: ["port", "tawny", "lbv", "colheita", "madeira", "marsala"],
    serving: {
      style: "Port & madeira",
      temperature: "14–16 °C for vintage port, 10–12 °C for tawny",
      chill: "A tawny or a madeira is better with twenty minutes in the fridge — most people serve them too warm and get only the alcohol. A vintage port wants cellar-cool.",
      glass: GLASS.small,
      air: "A vintage port throws heavy sediment: stand it up a day ahead, decant it carefully, and drink it within two days. A tawny or a madeira is the opposite — madeira has already been cooked and oxidised on purpose, and an open bottle will still be good months later.",
    },
  },
];

/* ------------------------------------------------------------ the buckets */

function base(kind: Kind, grapes: string[]): Serving {
  switch (kind) {
    case "sparkling":
      return {
        style: "Sparkling",
        temperature: "6–8 °C",
        chill: "Properly cold: three hours in the fridge, or twenty minutes in a bucket of ice and water, which is faster than a freezer and won't forget about it.",
        glass: GLASS.tulip,
        air: "Don't swirl it — you're pouring the bubbles away. Pour down the side of the glass rather than into the middle, and it keeps its fizz.",
      };

    case "dessert":
      return {
        style: "Dessert",
        temperature: "8–10 °C",
        chill: "A couple of hours in the fridge. Cold keeps the sweetness from turning cloying, but ice-cold flattens the fruit.",
        glass: GLASS.small,
        air: "A gentle swirl. It's already concentrated; it doesn't need opening up. An open bottle keeps for a week or two — sugar is a preservative.",
      };

    case "fortified":
      return {
        style: "Fortified",
        temperature: "12–16 °C, or 8–10 °C for a dry sherry",
        chill: "Twenty minutes in the fridge for port or madeira. Fino and manzanilla are white wines in all but name — serve them properly cold.",
        glass: GLASS.small,
        air: "Fine open on the side for days, unlike everything else here. A tawny or an oloroso will still be good next week.",
      };

    case "rose":
      return {
        style: "Rosé",
        temperature: "8–10 °C",
        chill: "Two hours in the fridge, then out of it while you pour. Straight from the door of the fridge is a little too cold.",
        glass: GLASS.white,
        air: "A swirl is plenty. Drink it young and cold.",
      };

    case "orange":
      return {
        style: "Orange",
        temperature: "12–14 °C",
        chill: "Cooler than a red, warmer than a white — about half an hour in the fridge, no more. Cold makes the skin tannins taste bitter.",
        glass: GLASS.big,
        air: "Treat it like a light red: swirl it, and give it half an hour open. Most of them change more in the glass than whites do.",
      };

    case "white":
      if (mentions(grapes, RICH_WHITES)) {
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

    case "red":
      if (mentions(grapes, LIGHT_REDS)) {
        return {
          style: "Light red",
          temperature: "12–14 °C",
          chill: "Yes, chilled — half an hour in the fridge before you open it. Served warm these go flat and jammy, which is why so many people think they don't like them.",
          glass: GLASS.wide,
          air: "Swirl it. No decanting: there's little tannin to soften and you'd blow off the perfume, which is the whole point.",
        };
      }
      if (mentions(grapes, FIRM_REDS)) {
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
}

function refine(kind: Kind, serving: Serving, terms: string[]): Serving {
  const hit = REFINEMENTS.find(
    (entry) => entry.kinds.includes(kind) && mentions(terms, entry.when),
  );
  return hit ? { ...serving, ...hit.serving } : serving;
}

/* -------------------------------------------------------------- the doors */

/**
 * What this bottle wants, from what's on the label.
 *
 * `label` is the producer, name and region run together — the only place a
 * Champagne says it's a Champagne, since its grape list is indistinguishable
 * from a still white burgundy's.
 *
 * `statedTemperature` is the producer's own, when the lookup found one; it wins
 * over the convention, because they know their wine.
 */
export function servingFor({
  wineType,
  grapes = [],
  label = "",
  statedTemperature,
}: {
  wineType: string | null;
  grapes?: string[];
  label?: string;
  statedTemperature?: string | null;
}): Serving | null {
  const kind = KIND_BY_TYPE[flatten(wineType ?? "")];
  if (!kind) return null;

  const flatGrapes = grapes.map(flatten).filter(Boolean);
  const terms = [...flatGrapes, flatten(label)].filter(Boolean);

  const serving = refine(kind, base(kind, flatGrapes), terms);

  const stated = statedTemperature?.trim();
  if (!stated) return serving;
  return {
    ...serving,
    temperature: stated,
    chill: `${serving.chill} The producer says ${stated}.`,
  };
}

/** Grapes that only ever show up with bubbles, so the grape page says so. */
const ALWAYS_SPARKLING = ["glera"];

/**
 * The same advice for a grape on its own, with no bottle in front of you.
 *
 * The grape page knows a colour and a name and nothing else, which is exactly
 * the two things layers 2 and 3 read — so a grape gets the same answer here as
 * it would on a bottle of it, minus whatever the label would have added.
 */
export function servingForGrape(
  name: string,
  colour: "red" | "white" | "other" | null,
): Serving | null {
  const flat = flatten(name);
  if (!flat) return null;

  const kind: Kind | null = mentions([flat], ALWAYS_SPARKLING)
    ? "sparkling"
    : colour === "red"
      ? "red"
      : colour === "white"
        ? "white"
        : null;
  if (!kind) return null;

  return refine(kind, base(kind, [flat]), [flat]);
}
