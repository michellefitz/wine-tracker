import BottlePlaceholder from "@/components/BottlePlaceholder";

/**
 * The shelf before the shelf arrives.
 *
 * The masthead and the nav are already on screen by the time this renders —
 * they don't depend on the database — so this only stands in for the part
 * that's still coming. It uses the same tiles as a real card with no photo,
 * at the same grid, so the page settles into itself rather than swapping one
 * layout for another.
 */
export default function CollectionSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-5">
        <span className="block h-[2.6875rem] w-full border-b border-rule" />
        <div className="mt-3 flex gap-6">
          {[3.5, 4.5, 6].map((width) => (
            <span key={width} className="block h-2 rounded-full bg-tint" style={{ width: `${width}rem` }} />
          ))}
        </div>
      </div>

      <ul className="grid animate-pulse grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5">
        {[0, 1, 2, 3, 4, 5].map((slot) => (
          <li key={slot}>
            <div className="aspect-4/5 w-full overflow-hidden bg-tint">
              <BottlePlaceholder />
            </div>
            <div className="space-y-2 pt-4">
              <span className="block h-2 w-10 rounded-full bg-tint" />
              <span className="block h-3 w-4/5 rounded-full bg-tint" />
              <span className="block h-2 w-3/5 rounded-full bg-tint" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
