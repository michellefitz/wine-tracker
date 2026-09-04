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
