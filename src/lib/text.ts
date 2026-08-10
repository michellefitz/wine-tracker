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
