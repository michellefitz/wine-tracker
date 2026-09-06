/**
 * What fills the sheet for the moment between it arriving and its contents
 * doing so.
 *
 * The sheet used to wait on the server before it existed at all, so a tap did
 * nothing for a fifth of a second and then everything happened at once. Now the
 * shell streams immediately and this holds its place — the same trick the shelf
 * uses, for the same reason.
 *
 * Its whole job is to be the same shape as what replaces it, which means it is
 * a copy of WineDetail's layout and has to be changed with it. When the bottle
 * grew from 11rem to the full width of the column this didn't, and the swap
 * turned into a jump: a small grey box became a large photograph and everything
 * under it moved. Held to the same measurements, the arriving bottle lands
 * exactly where the placeholder was and the change reads as the picture filling
 * in rather than the page relaying itself.
 *
 * The rules are drawn in full rather than sketched, because they are already
 * the right colour and the right place — anything the real thing has that this
 * can have for nothing is one less edge that moves.
 */
export default function SheetSkeleton({ still = false }: { still?: boolean }) {
  return (
    <div
      /*
       * The pulse says "still working" while this is what's on screen, and is
       * turned off for the copy Settling fades out — that one is mid-handover,
       * and a fresh pulse would restart the cycle at a different brightness
       * from the one it is taking over from.
       */
      className={`mx-auto w-full max-w-3xl px-5 pt-1 ${still ? "" : "animate-pulse"}`}
      aria-hidden="true"
    >
      {/* Where Edit sits — the height of the link, not of the mark for it. */}
      <div className="mb-4 flex h-[26px] items-center justify-end">
        <span className="block h-2.5 w-10 rounded-full bg-tint" />
      </div>

      {/* The bottle: WineDetail's own max-w-[20rem] and 4/5, to the pixel. */}
      <div className="mx-auto aspect-4/5 w-full max-w-[20rem] bg-tint" />

      {/*
        The wall label — producer, name, place, rating — at mt-6, as there.

        Each line reserves the height of the writing that replaces it and draws
        something smaller inside, which is the difference between a placeholder
        that holds a place and one that merely looks like text. Marks the size
        of the real line would be a page of grey bars; marks too small to fill
        the line leave the rest of the sheet sitting too high and everything
        shifts down when the bottle lands.
      */}
      <div className="mt-6 flex flex-col items-center">
        <span className="flex h-[17px] items-center">
          <span className="block h-2.5 w-24 rounded-full bg-tint" />
        </span>
        <span className="mt-2 flex h-[34px] items-center">
          <span className="block h-4 w-56 rounded-full bg-tint" />
        </span>
        <span className="mt-2 flex h-[22px] items-center">
          <span className="block h-3 w-32 rounded-full bg-tint" />
        </span>
        <span className="mt-4 flex h-[18px] items-center">
          <span className="block h-3.5 w-20 rounded-full bg-tint" />
        </span>
      </div>

      {/* The details table, closed top and bottom by its own rules. */}
      <dl className="mx-auto mt-8 max-w-md divide-y divide-rule border-y border-rule">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="py-2.5">
            <div className="flex h-[26px] items-center justify-between gap-6">
              <span className="block h-2.5 w-20 rounded-full bg-tint" />
              <span className="block h-2.5 w-16 rounded-full bg-tint" />
            </div>
          </div>
        ))}
      </dl>

      {/* And the first section heading below it, so the fold isn't empty. */}
      <div className="mt-10 flex items-center gap-3">
        <span className="block h-5 w-5 rounded-full bg-tint" />
        <span className="block h-5 w-28 rounded-full bg-tint" />
      </div>
    </div>
  );
}
