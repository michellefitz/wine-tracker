import { flatten } from "@/lib/text";

/**
 * The words printed on wine labels, in plain English.
 *
 * Hand-written rather than generated: this is settled, slow-moving knowledge,
 * and a reference you might read standing in a shop with one bar of signal
 * shouldn't depend on an API call. It's also the one part of the app where
 * being wrong would be worse than being absent, so every entry here is a rule
 * that actually exists, hedged where it genuinely varies by region.
 *
 * `tell` is the part that matters most: not what the word means, but what it
 * tells you about the bottle — including, often, nothing at all.
 */

export type LabelGroup =
  | "Where it's from"
  | "How long it was aged"
  | "How sweet it is"
  | "Bubbles"
  | "How it was made"
  | "Words that mean nothing";

export const LABEL_GROUPS: LabelGroup[] = [
  "Where it's from",
  "How long it was aged",
  "How sweet it is",
  "Bubbles",
  "How it was made",
  "Words that mean nothing",
];

export type LabelTerm = {
  term: string;
  /** Other spellings and near-synonyms, so search finds them too. */
  also?: string[];
  /** Roughly how to say it, for the ones that stop people ordering out loud. */
  say?: string;
  group: LabelGroup;
  meaning: string;
  tell?: string;
};

export const LABEL_TERMS: LabelTerm[] = [
  // --- Where it's from ----------------------------------------------------
  {
    term: "AOC / AOP",
    also: ["Appellation d'Origine Contrôlée", "Appellation Contrôlée", "Appellation d'Origine Protégée"],
    say: "ay-oh-say",
    group: "Where it's from",
    meaning:
      "France's tightest category. The label names a place, and the rules for that place set which grapes may be planted, how much may be grown, and often how the wine is made.",
    tell: "It promises the wine tastes like its region — not that it's good. It also means the grape usually isn't printed anywhere, so you have to know the place to know what's in the bottle.",
  },
  {
    term: "IGP / Vin de Pays",
    also: ["Indication Géographique Protégée"],
    say: "van duh pay-ee",
    group: "Where it's from",
    meaning:
      "A step down in strictness from AOC: bigger areas, fewer rules about what may be planted.",
    tell: "Usually where French bottles do print the grape on the front, and often where the value is.",
  },
  {
    term: "Vin de France",
    group: "Where it's from",
    meaning: "The loosest French category — the grapes may come from anywhere in the country.",
    tell: "Covers both the cheapest bulk wine and the odd serious winemaker who'd rather ignore the rulebook than obey it.",
  },
  {
    term: "DOC / DOCG",
    also: ["Denominazione di Origine Controllata", "Garantita"],
    say: "doke / doke-jee",
    group: "Where it's from",
    meaning:
      "Italy's controlled names. DOCG is the tier above DOC, and those bottles carry a numbered government seal across the neck.",
    tell: "It means the rules were followed and a panel tasted it. It says nothing about whether you'll enjoy it.",
  },
  {
    term: "IGT",
    also: ["Indicazione Geografica Tipica"],
    group: "Where it's from",
    meaning: "Italy's freer regional category, a tier below DOC on paper.",
    tell: "Don't read it as lesser. Some of Italy's most expensive reds are IGT because they're made from grapes their own DOC won't allow.",
  },
  {
    term: "DO / DOCa / DOQ",
    also: ["Denominación de Origen", "Calificada", "Qualificada"],
    group: "Where it's from",
    meaning:
      "Spain's controlled names. DO is the standard tier; DOCa (DOQ in Catalan) sits above it and only two regions hold it — Rioja and Priorat.",
  },
  {
    term: "Classico",
    group: "Where it's from",
    meaning:
      "The historic heart of a zone, usually the older hillside vineyards, before the name was extended to the land around it.",
    tell: "Generally a better bottle than the same wine without the word. Chianti Classico wears a black rooster on the neck.",
  },
  {
    term: "Cru",
    also: ["Premier Cru", "Grand Cru", "1er Cru"],
    say: "kroo",
    group: "Where it's from",
    meaning: "French for \"growth\": a named vineyard or village reckoned to be better than its neighbours.",
    tell: "What it's worth depends entirely on where. In Burgundy, Grand Cru is the top and Premier Cru just below it. In Beaujolais, a Cru is one of ten named villages. In Saint-Émilion, \"Grand Cru\" covers a great many bottles and isn't the badge it sounds like.",
  },
  {
    term: "Château / Domaine / Bodega / Weingut / Quinta / Tenuta",
    say: "sha-TOE / doh-MAIN / bo-DAY-ga",
    group: "Where it's from",
    meaning:
      "The word for \"wine estate\" in French, French, Spanish, German, Portuguese and Italian respectively.",
    tell: "No actual château required. It's the equivalent of \"farm\", not a grade.",
  },
  {
    term: "Estate bottled",
    also: ["Mis en bouteille au château", "Mis en bouteille au domaine", "Gutsabfüllung"],
    group: "Where it's from",
    meaning:
      "Grown, made and bottled by the same people in the same place, rather than bought in as finished wine and bottled elsewhere.",
    tell: "One of the more meaningful phrases on a supermarket bottle.",
  },

  // --- How long it was aged -----------------------------------------------
  {
    term: "Crianza",
    say: "cree-AN-tha",
    group: "How long it was aged",
    meaning:
      "Spanish ageing tier. A red Rioja Crianza has had at least two years before release, one of them in barrel.",
    tell: "The youngest and fruitiest of the aged tiers, and usually the cheapest.",
  },
  {
    term: "Reserva",
    group: "How long it was aged",
    meaning: "A red Rioja Reserva has had at least three years, at least one in barrel.",
    tell: "Softer and more savoury than a Crianza — leather, vanilla and dried fruit creeping in over the fresh fruit. Minimums differ by region and are shorter for whites.",
  },
  {
    term: "Gran Reserva",
    group: "How long it was aged",
    meaning: "A red Rioja Gran Reserva has had at least five years, at least two of them in barrel.",
    tell: "Usually made only in years the producer rated highly. Mellow, dried-fruit, autumnal — a long way from a young red.",
  },
  {
    term: "Riserva",
    group: "How long it was aged",
    meaning:
      "The Italian equivalent: legally longer ageing than the standard wine of the same zone. How much longer depends on the zone — two years for Chianti Classico Riserva, five for Barolo Riserva.",
  },
  {
    term: "Superiore",
    group: "How long it was aged",
    meaning:
      "Italian for a version of the same wine with a little more alcohol, and usually a little more ageing, than the basic bottling.",
  },
  {
    term: "Vieilles Vignes / Old Vines",
    say: "vyay VEEN-yuh",
    group: "How long it was aged",
    meaning:
      "Made from older vines, which crop less and can give more concentrated fruit.",
    tell: "Almost nowhere defines how old \"old\" is. Worth something from a producer you already trust, and nothing at all from one you don't.",
  },
  {
    term: "NV / Non-vintage",
    group: "How long it was aged",
    meaning: "Blended from more than one year's harvest, so there's no year on the label.",
    tell: "Normal and deliberate for most Champagne and sparkling wine: the house is aiming for the same taste every year.",
  },

  // --- How sweet it is ----------------------------------------------------
  {
    term: "Brut",
    say: "broot",
    group: "How sweet it is",
    meaning: "The standard dry style for sparkling wine, and the one to reach for by default.",
  },
  {
    term: "Extra Dry",
    group: "How sweet it is",
    meaning: "Sweeter than Brut, despite what it says.",
    tell: "The most useful trap to know on the whole shelf. Driest to sweetest runs: Brut Nature, Extra Brut, Brut, Extra Dry, Sec, Demi-Sec, Doux.",
  },
  {
    term: "Brut Nature / Extra Brut",
    also: ["Brut Zero", "Pas Dosé"],
    group: "How sweet it is",
    meaning: "Bone dry — little or no sugar added after the bubbles are made.",
    tell: "Bracing and lean. Lovely with oysters, hard work on its own.",
  },
  {
    term: "Sec / Secco / Seco",
    group: "How sweet it is",
    meaning: "\"Dry\" — on a still wine, exactly that.",
    tell: "On a sparkling label it isn't dry at all: it sits two steps sweeter than Brut.",
  },
  {
    term: "Demi-Sec / Dolce / Doux",
    say: "demee-SEK",
    group: "How sweet it is",
    meaning: "Noticeably sweet through to properly sweet.",
    tell: "Pudding wine. A surprise if you opened it expecting dinner wine.",
  },
  {
    term: "Trocken / Halbtrocken / Feinherb",
    say: "TROCK-en",
    group: "How sweet it is",
    meaning: "German for dry / half-dry. Feinherb is an unofficial word for something around off-dry.",
    tell: "If a German bottle doesn't say trocken, expect at least a little sweetness.",
  },
  {
    term: "Kabinett / Spätlese / Auslese",
    say: "SHPAYT-lay-zuh / OWS-lay-zuh",
    group: "How sweet it is",
    meaning:
      "German ripeness levels at picking, lightest first. Spätlese means \"late picked\", Auslese \"selected\" — riper grapes each step up.",
    tell: "Ripeness, not sweetness. They do tend to get sweeter as you climb, unless the label also says trocken — then they're dry and simply richer.",
  },
  {
    term: "Amabile / Abboccato",
    group: "How sweet it is",
    meaning: "Italian for gently sweet and lightly sweet.",
  },
  {
    term: "Off-dry",
    group: "How sweet it is",
    meaning: "A touch of sweetness — there, but not enough to call the wine sweet.",
    tell: "Often what someone means when they say they don't like dry wine. Worth trying deliberately before you decide.",
  },

  // --- Bubbles ------------------------------------------------------------
  {
    term: "Méthode traditionnelle",
    also: ["Méthode champenoise", "Traditional method", "Metodo classico"],
    say: "may-TOD tra-dee-syon-ELL",
    group: "Bubbles",
    meaning:
      "The bubbles were made by a second fermentation inside the bottle you're holding, the way Champagne is made.",
    tell: "Finer, more persistent bubbles and a bready, toasty flavour from time spent on the yeast.",
  },
  {
    term: "Charmat / tank method",
    say: "shar-MAH",
    group: "Bubbles",
    meaning: "The second fermentation happened in a big pressurised tank, then the wine was bottled.",
    tell: "Keeps the fruit fresh and floral instead of bready. It's how Prosecco is made — a different aim, not a cheaper trick.",
  },
  {
    term: "Crémant",
    say: "kray-MON",
    group: "Bubbles",
    meaning:
      "French traditional-method sparkling from outside Champagne — Loire, Alsace, Burgundy, Limoux and others.",
    tell: "Usually the best-value fizz in the shop: same method as Champagne, a fraction of the name.",
  },
  {
    term: "Cava",
    group: "Bubbles",
    meaning: "Spanish traditional-method sparkling, most of it made near Barcelona.",
  },
  {
    term: "Blanc de Blancs / Blanc de Noirs",
    say: "blon duh BLON / blon duh NWAR",
    group: "Bubbles",
    meaning: "White wine from white grapes / white wine from black grapes.",
    tell: "Blanc de Blancs tends to be leaner and citrussy; Blanc de Noirs rounder and more apple-and-red-fruit.",
  },
  {
    term: "Pét-nat",
    also: ["Pétillant naturel", "Méthode ancestrale"],
    say: "pay-NAT",
    group: "Bubbles",
    meaning:
      "Bottled before the first fermentation has finished, so it keeps a gentle fizz. Often cloudy, usually sealed with a crown cap.",
    tell: "Cidery, unpredictable and fashionable. Fun, but not the safe choice for a table of six.",
  },
  {
    term: "Frizzante / Spumante",
    group: "Bubbles",
    meaning: "Lightly sparkling / fully sparkling, in Italian.",
  },

  // --- How it was made ----------------------------------------------------
  {
    term: "Sur lie",
    say: "soor LEE",
    group: "How it was made",
    meaning: "Left to rest on the spent yeast after fermenting, instead of being racked off it.",
    tell: "Adds a savoury, faintly bready richness and a rounder texture. Classic on Muscadet.",
  },
  {
    term: "Barrique / barrel-aged / oaked",
    say: "ba-REEK",
    group: "How it was made",
    meaning: "Time spent in oak barrels, new ones giving more flavour than old.",
    tell: "Vanilla, toast, baking spice, sometimes coconut — plus a softer, rounder texture. If you've written \"oaky\" in your notes, this is the word that predicts it.",
  },
  {
    term: "Unoaked / stainless steel",
    group: "How it was made",
    meaning: "No barrels — fermented and kept in steel.",
    tell: "Fresher and more direct. An unoaked Chardonnay and an oaked one taste so different you'd swear they were different grapes.",
  },
  {
    term: "Carbonic maceration",
    group: "How it was made",
    meaning: "Whole uncrushed bunches ferment from the inside out before being pressed.",
    tell: "Bright, juicy, low-tannin reds with a lift of banana and bubblegum. The Beaujolais trick, and worth knowing if you dislike grippy reds.",
  },
  {
    term: "Skin contact / orange wine",
    group: "How it was made",
    meaning: "White grapes left to ferment on their skins, the way a red is made.",
    tell: "Gives a white wine actual tannin — dry, tea-like and gripping. Wildly different from a normal white; try one before buying two.",
  },
  {
    term: "Organic / biodynamic",
    group: "How it was made",
    meaning:
      "Certified ways of farming the vineyard. Biodynamic adds a lunar calendar and some unusual preparations on top of organic rules.",
    tell: "Tells you how the grapes were grown. It doesn't tell you how the wine tastes, and it isn't a quality grade.",
  },
  {
    term: "Natural wine",
    group: "How it was made",
    meaning:
      "No legal definition anywhere. Broadly: as little intervention as possible and little or no added sulphur.",
    tell: "Can be thrilling and can be faulty, occasionally both in the same glass. Buy from a shop that tastes what it sells.",
  },
  {
    term: "Contains sulphites",
    group: "How it was made",
    meaning:
      "On nearly every bottle you'll ever pick up, because fermentation produces sulphites on its own before anyone adds any.",
    tell: "Not a sign of cheap or industrial wine, and almost certainly not what gave you the headache.",
  },
  {
    term: "Alcohol %",
    group: "How it was made",
    meaning: "The one number on the label that's regulated, comparable and always there.",
    tell: "The best free clue to body. Around 11–12% usually means light and probably crisp; 14.5% and up means ripe, warm and full. It's the body scale, printed in plain sight.",
  },
  {
    term: "Cuvée",
    say: "koo-VAY",
    group: "How it was made",
    meaning: "A blend, or simply a particular batch the producer has chosen to bottle separately.",
    tell: "On its own it promises nothing at all.",
  },

  // --- Words that mean nothing --------------------------------------------
  {
    term: "Reserve / Reserva-sounding words",
    also: ["Winemaker's Reserve", "Private Selection", "Vintner's Choice", "Special Reserve"],
    group: "Words that mean nothing",
    meaning:
      "Outside Spain, Italy and Portugal, \"Reserve\" is unregulated in most of the world, including much of the New World.",
    tell: "On a Rioja it's a legal ageing category. On a €9 Australian red it's a brand name.",
  },
  {
    term: "Medals and awards",
    group: "Words that mean nothing",
    meaning: "Stickers from competitions producers pay an entry fee to be judged in.",
    tell: "Plenty of good wine wins them and plenty never enters. It mostly proves someone paid the fee.",
  },
  {
    term: "Limited release / small batch / hand-picked",
    group: "Words that mean nothing",
    meaning: "Unregulated phrases. Nobody checks the batch was small or the hands were involved.",
  },
  {
    term: "A very heavy bottle",
    group: "Words that mean nothing",
    meaning:
      "Glass weight is a packaging decision, chosen to feel expensive in your hand.",
    tell: "It correlates with marketing spend, not with what's inside.",
  },
];

/** Everything a search box should match on for one term. */
function haystack(entry: LabelTerm): string {
  return flatten(
    [entry.term, ...(entry.also ?? []), entry.meaning, entry.tell ?? ""].join(" "),
  );
}

export function matchTerms(query: string): LabelTerm[] {
  const needle = flatten(query);
  if (!needle) return LABEL_TERMS;
  return LABEL_TERMS.filter((entry) => haystack(entry).includes(needle));
}

export function termsInGroup(entries: LabelTerm[], group: LabelGroup): LabelTerm[] {
  return entries.filter((entry) => entry.group === group);
}
