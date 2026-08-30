/**
 * Flattens a string for matching: lowercase, accents stripped, punctuation
 * reduced to single spaces.
 *
 * Used wherever the thing being matched was typed by a person — a grape name
 * in the log, a search for "creman" when the label says Crémant.
 */
export function flatten(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The same idea, for names nobody typed.
 *
 * `flatten` reduces to a-z0-9 because it matches what a person put in a form,
 * and on this phone that is Latin. Region names come from the EU register
 * instead, where a third of Bulgaria and all of Greece are not — and reducing
 * those to a-z0-9 turns every Bulgarian appellation into the same empty
 * string. Keeps Greek and Cyrillic; identical to `flatten` for anything Latin,
 * which is the only reason the two can be used either side of the same match.
 */
export function flattenLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^0-9a-z\u0370-\u03ff\u1f00-\u1fff\u0400-\u04ff\u0500-\u052f]+/g, " ")
    .trim();
}
