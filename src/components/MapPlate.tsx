import { fit } from "@/lib/map-projection";
import type { Ring } from "@/lib/map-geometry";

export type Mark = {
  key: string;
  longitude: number;
  latitude: number;
  /** How many bottles — sets the size of the dot. */
  count: number;
  /** How vague the placement is, in kilometres — sets the size of the halo. */
  spread: number;
  label: string | null;
  href: string;
};

/**
 * Land, and dots on it.
 *
 * The two sizes say different things and are deliberately not the same channel.
 * The dot grows with how many bottles came from a place; the halo behind it
 * grows with how little we know about where that place is — tight around an
 * appellation, wide and faint around "somewhere in Portugal". A bottle whose
 * label named nothing is therefore visibly a smudge over a country rather than
 * a claim about a hillside, which is the honest way to show it and the only way
 * to keep every bottle on the map without lying about some of them.
 */
export default function MapPlate({
  land,
  marks,
  width = 340,
  height = 220,
  detailed = false,
}: {
  land: Ring[];
  marks: Mark[];
  width?: number;
  height?: number;
  /** A country plate: darker coastline, since it's the subject rather than a ground. */
  detailed?: boolean;
}) {
  const projection = fit(land, width, height, detailed ? 18 : 6);

  // Kilometres to px, from the projection's own scale, so a halo means the same
  // thing on a world map and on a country plate.
  const [ax, ay] = projection.project(0, 0);
  const [bx] = projection.project(1, 0);
  const pxPerDegree = Math.abs(bx - ax) || 1;
  const km = (value: number) => (value / 111) * pxPerDegree;
  void ay;

  /*
   * Where each label goes. Above the halo by default, flipped below when that
   * would land on one already placed — which happens as soon as two
   * appellations are neighbours, and Barolo and Colline Novaresi are ninety
   * kilometres apart. Cheap, and enough: a third collision in the same spot
   * would need real label placement, and three marks that close would need a
   * closer map anyway.
   */
  const placed: { x: number; y: number; half: number }[] = [];
  const labelled = marks.map((mark) => {
    const [x, y] = projection.project(mark.longitude, mark.latitude);
    const radius = 3.4 + Math.min(mark.count, 12) * 1.3;
    const halo = Math.max(km(mark.spread), radius + 2);
    if (!mark.label) return { mark, x, y, radius, halo, labelY: 0 };

    const half = (mark.label.length * (detailed ? 5.2 : 4.6)) / 2;
    const above = y - halo - 5;
    const below = y + halo + 11;
    const clashes = (candidate: number) =>
      placed.some((other) => Math.abs(other.y - candidate) < 11 && Math.abs(other.x - x) < other.half + half);

    const labelY = clashes(above) && !clashes(below) ? below : above;
    placed.push({ x, y: labelY, half });
    return { mark, x, y, radius, halo, labelY };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={detailed ? "Map of the regions you've drunk from" : "World map of where your wine comes from"}
    >
      {land.map((ring, index) => (
        <path
          key={index}
          d={projection.path(ring)}
          fill={detailed ? "var(--color-tint)" : "#e0d5c2"}
          stroke={detailed ? "var(--color-ink)" : "var(--color-rule)"}
          strokeWidth={detailed ? 1.1 : 0.9}
          strokeLinejoin="round"
        />
      ))}

      {labelled.map(({ mark, x, y, radius, halo, labelY }) => {
        return (
          <a key={mark.key} href={mark.href}>
            <circle cx={x} cy={y} r={halo} fill="var(--color-wine)" fillOpacity={0.14} />
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill="var(--color-wine)"
              stroke="var(--color-paper)"
              strokeWidth={1.6}
            />
            {mark.label && (
              <text
                x={x}
                y={labelY}
                textAnchor="middle"
                fontSize={detailed ? 9.5 : 8.5}
                fontWeight={500}
                letterSpacing="0.8"
                fill="var(--color-ink)"
              >
                {mark.label}
              </text>
            )}
          </a>
        );
      })}
    </svg>
  );
}
