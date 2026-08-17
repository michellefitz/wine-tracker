/**
 * What fills the sheet for the moment between it arriving and its contents
 * doing so.
 *
 * The sheet used to wait on the server before it existed at all, so a tap did
 * nothing for a fifth of a second and then everything happened at once. Now the
 * shell streams immediately and this holds its place — the same trick the shelf
 * uses, for the same reason.
 */
export default function SheetSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-5 pt-1" aria-hidden="true">
      <div className="mb-4 flex justify-end">
        <span className="block h-2.5 w-10 rounded-full bg-tint" />
      </div>

      <div className="mx-auto aspect-4/5 w-full max-w-[11rem] bg-tint" />

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="block h-2.5 w-24 rounded-full bg-tint" />
        <span className="block h-5 w-52 rounded-full bg-tint" />
        <span className="block h-2.5 w-28 rounded-full bg-tint" />
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-5">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex justify-between gap-6">
            <span className="block h-2.5 w-20 rounded-full bg-tint" />
            <span className="block h-2.5 w-16 rounded-full bg-tint" />
          </div>
        ))}
      </div>
    </div>
  );
}
