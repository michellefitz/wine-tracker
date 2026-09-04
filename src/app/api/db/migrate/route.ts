import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
// Plain .mjs, so the node script and this route share one list without a build step.
import { STATEMENTS } from "@/lib/schema.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Brings the database up to the shape the code expects.
 *
 * The same statements as `npm run db:init`, from inside the app. That script
 * assumes a laptop, a checkout and a terminal, and this app is used on a
 * phone — so a column added in a deploy could sit un-applied indefinitely,
 * with the only symptom a line of red text telling you to run a command you
 * have no way to run. That is the whole reason this exists.
 *
 * Every statement is CREATE/ALTER ... IF NOT EXISTS, so this is safe to run
 * as often as you like and does nothing at all once the schema is current.
 * It cannot drop a column or a table: there is no statement here that removes
 * anything.
 */
export async function POST() {
  const db = sql();
  const statements = STATEMENTS as string[];

  const failed: { statement: string; error: string }[] = [];
  for (const statement of statements) {
    try {
      await db.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("migrate: statement failed:", statement.slice(0, 60), message);
      failed.push({ statement: statement.trim().slice(0, 80), error: message.slice(0, 200) });
    }
  }

  if (failed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        ran: statements.length - failed.length,
        of: statements.length,
        failed,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ran: statements.length, of: statements.length });
}
