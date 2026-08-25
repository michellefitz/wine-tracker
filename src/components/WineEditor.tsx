import Link from "next/link";
import CancelEdit from "@/components/CancelEdit";
import WineForm from "@/components/WineForm";
import type { Wine } from "@/lib/types";

/**
 * The edit form, rendered the same whether it arrived as a page or as a sheet.
 *
 * The same arrangement as WineDetail, and for the same reason: a bottle opened
 * from the shelf lives in a sheet, so the Edit link inside it has to land in a
 * sheet too. It used to land on the page underneath, which is a page you can
 * neither see nor reach — the sheet is on top of it and covers the screen.
 *
 * `sheet` changes the frame, not the form: no page-height wrapper, no top
 * padding for a status bar that isn't there, and a Cancel that goes back
 * rather than forward.
 */
export default function WineEditor({
  wine,
  sheet = false,
}: {
  wine: Wine;
  sheet?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-xl px-5 pb-10 ${
        sheet ? "pt-1" : "min-h-dvh pt-[max(1.75rem,env(safe-area-inset-top))]"
      }`}
    >
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">Editing</p>
          {sheet ? (
            <CancelEdit />
          ) : (
            <Link href={`/wine/${wine.id}`} className="link-quiet">
              Cancel
            </Link>
          )}
        </div>
        <h1 className="essay mt-3 text-[1.625rem] leading-tight text-ink">{wine.name}</h1>
      </header>

      <WineForm mode="edit" wine={wine} />
    </div>
  );
}
