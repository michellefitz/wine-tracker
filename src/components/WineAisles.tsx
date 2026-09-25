import WineCard from "@/components/WineCard";
import type { Wine } from "@/lib/types";
import { GROUP_ORDER, groupWines } from "@/lib/wine-groups";

/**
 * One shop's wines, laid out the way you'd walk them.
 *
 * This is the shelf's grouping and the list's cards, which is a deliberate
 * pairing rather than a third design. The shelf is for browsing at home: big
 * photographs, one row per kind, the bottle you half-remember recognised by
 * its label. Standing in an aisle you are doing the opposite — you have the
 * bottle in your hand and you want the verdict, the producer and the vintage
 * in writing, and you want to see a whole section at once rather than swipe
 * sideways through it.
 *
 * Reds, whites, rosés, sparkling, and the headings are the only grouping
 * there is. Sub-dividing each of those by verdict as well was the obvious next
 * step and would have been wrong: four bottles from a shop split across two
 * headings apiece is a page of headings with a bottle under each. The verdict
 * is on every card, in colour, which is enough to find the loved ones in a
 * section of five.
 */

/**
 * Best first — and "best" is just the rating scale read downwards.
 *
 * 2, 1, 0, -1, -2 puts loved at the top, then liked, then the bottles you own
 * and haven't opened, then the ones to walk past. Unopened landing in the
 * middle is the useful accident: in a shop it means "you already have one of
 * these at home", which is neither a recommendation nor a warning and belongs
 * exactly where the scale puts it.
 *
 * Sorted rather than grouped, and stable, so within one verdict the newest
 * bottles stay first as they are everywhere else.
 */
function byVerdict(wines: Wine[]): Wine[] {
  return [...wines].sort((a, b) => b.score - a.score);
}

export default function WineAisles({ wines }: { wines: Wine[] }) {
  const groups = groupWines(wines);

  return (
    <div>
      {GROUP_ORDER.filter((type) => groups.has(type)).map((type) => (
        <section key={type} className="mt-9 first:mt-0">
          <h2 className="essay text-[1.375rem] leading-none text-ink-soft">{type}</h2>
          <ul
            className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7
              sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10"
          >
            {byVerdict(groups.get(type)!).map((wine) => (
              <li key={wine.id}>
                <WineCard wine={wine} heading="h3" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
