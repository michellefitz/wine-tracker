/**
 * The opening words of every warning the database schema can produce.
 *
 * A marker, not decoration: the wine page looks for it and puts a button under
 * the message instead of leaving you holding an instruction you can't follow.
 *
 * It lives alone, with nothing imported, because both sides of that match need
 * it — wine-facts.ts writes it on the server, WineFactsView reads it in the
 * browser. Declaring it next to the writer meant a client component importing
 * wine-facts, which pulls the database driver and the Anthropic SDK into the
 * browser bundle behind it. The build said so, in the form of `dns` and `fs`
 * failing to resolve.
 */
export const SCHEMA_TROUBLE = "This isn't being saved yet:";

const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";

/**
 * Whether a database error is "this deploy wants a column you haven't got",
 * and if so how to say it.
 *
 * Lifted out of wine-facts so the shelf can use it too. The bottle page has
 * been able to offer the repair button for a while; the home page could not,
 * and answered a missing column with "Couldn't reach the database — check
 * DATABASE_URL, and that you've run `npm run db:init`". On a phone, on a
 * screen where every wine has just vanished, that is the least useful true
 * sentence available. It also mattered more than it looked: the shelf is the
 * first thing that breaks, so it is the first place the fix has to be.
 *
 * Returns null for anything that isn't a schema problem — a real outage should
 * not offer a button that can't help.
 */
export function schemaTrouble(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (code === UNDEFINED_TABLE || /relation .* does not exist/i.test(message)) {
    const named = /relation "?([\w.]+)"? does not exist/i.exec(message)?.[1];
    return named
      ? `${SCHEMA_TROUBLE} the database has no "${named.replace(/^\w+\./, "")}" table yet.`
      : `${SCHEMA_TROUBLE} the database is missing a table this version needs.`;
  }
  if (code === UNDEFINED_COLUMN || /column .* does not exist/i.test(message)) {
    const named = /column "?([\w.]+)"? .*does not exist/i.exec(message)?.[1];
    return named
      ? `${SCHEMA_TROUBLE} the database has no "${named.replace(/^\w+\./, "")}" column yet.`
      : `${SCHEMA_TROUBLE} the database is missing a column this version needs.`;
  }
  return null;
}
