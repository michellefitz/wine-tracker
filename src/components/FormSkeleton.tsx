/** The shape of the form, for the moment before the wine arrives. */
export default function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl animate-pulse px-5 pt-1" aria-hidden="true">
      <div className="mb-8">
        <span className="block h-2.5 w-16 rounded-full bg-tint" />
        <span className="mt-4 block h-6 w-52 rounded-full bg-tint" />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="mb-7">
          <span className="block h-2.5 w-20 rounded-full bg-tint" />
          <span className="mt-3 block h-8 w-full bg-tint" />
        </div>
      ))}
    </div>
  );
}
