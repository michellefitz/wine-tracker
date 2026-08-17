import { findFacts, type StoredFacts } from "@/lib/wine-facts";
import { getWine } from "@/lib/wines";
import type { Wine } from "@/lib/types";

/**
 * Everything the bottle view needs, loaded once for both the routes that show
 * it — the page and the sheet intercepting it.
 *
 * The lookup itself is deliberately not here: it belongs to the client panel. A
 * render that can be killed halfway takes the whole view down with it, which is
 * exactly what used to happen.
 */
export async function loadWineDetail(
  id: string,
): Promise<{ wine: Wine; stored: StoredFacts | null } | null> {
  const wine = await getWine(id);
  if (!wine) return null;

  let stored: StoredFacts | null = null;
  try {
    stored = await findFacts(id);
  } catch (error) {
    console.error("wine: could not read stored facts:", error);
  }

  return { wine, stored };
}
