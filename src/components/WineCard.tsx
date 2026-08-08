import Link from "next/link";
import LabelCard from "@/components/LabelCard";
import RatingMark from "@/components/RatingMark";
import type { Wine } from "@/lib/types";

/**
 * A tile in the log. Shows a typeset label rather than your photo: camera shots
 * vary in angle, distance and light, and a wall of them reads as clutter. The
 * photo you took is kept and shown on the entry itself.
 */
export default function WineCard({ wine }: { wine: Wine }) {
  return (
    <Link href={`/wine/${wine.id}`} className="group block">
      <div className="aspect-4/5 w-full overflow-hidden">
        <LabelCard wine={wine} />
      </div>
      <div className="pt-2.5">
        <RatingMark score={wine.score} />
      </div>
    </Link>
  );
}
