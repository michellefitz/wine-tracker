import { COUNTRY_SHAPES, type Ring } from "@/lib/map-geometry";
import { fit } from "@/lib/map-projection";

/*
 * Size: the country fits the frame, and that is the whole rule.
 *
 * It used to be a scale — every country drawn to the same width, allowed to
 * hang off the top and bottom, with a ceiling to catch Chile, and a debate
 * about nudging it sideways — because the outline was behind an opaque
 * photograph and could only be seen in whatever margin was left around it.
 * Anything that fitted the frame was hidden by the frame, so it had to be too
 * big for it, and a country shaped like a bottle was hidden whatever you did.
 *
 * Multiplying over the photograph removes the constraint entirely: every part
 * of the outline is visible now, including the parts crossing the bottle. So
 * it simply fits, centred, as large as the frame allows — which for Italy or
 * France is nearly the full width, and for Portugal or Chile is a narrow
 * shape running the full height. Narrow used to mean invisible. It doesn't
 * any more.
 *
 * Fitting also keeps it inside the picture, which matters more than it did:
 * the frame no longer clips anything, so an outline sized past it would run
 * down over the producer's name and the writing below.
 */

/**
 * How far from the main landmass a piece can be and still be drawn, in degrees.
 *
 * France is the reason. Its shape includes Guadeloupe, Martinique, Réunion and
 * French Guiana, so fitting the whole set spans the Atlantic and mainland
 * France comes out as a speck in the corner — which is exactly what it did.
 * Spain has the Canaries, Portugal the Azores and Madeira.
 *
 * Nine degrees keeps everything anyone would draw as part of the country's
 * outline — Sicily, Sardinia, Corsica, the Balearics — and drops everything
 * that only shares its passport.
 */
const NEAR = 9;

/** The country as a person would sketch it: the mainland and what's beside it. */
function mainland(rings: Ring[]): Ring[] {
  if (rings.length < 2) return rings;

  const boxes = rings.map((ring) => {
    let west = 180, south = 90, east = -180, north = -90;
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
    return { west, south, east, north, span: (east - west) * (north - south) };
  });

  const biggest = boxes.reduce((a, b) => (b.span > a.span ? b : a));
  const cx = (biggest.west + biggest.east) / 2;
  const cy = (biggest.south + biggest.north) / 2;

  return rings.filter((_, index) => {
    const box = boxes[index];
    return (
      Math.hypot((box.west + box.east) / 2 - cx, (box.south + box.north) / 2 - cy) <= NEAR
    );
  });
}

/**
 * The country the bottle came from, drawn faintly behind it.
 *
 * A watermark, not a map: no labels, no borders with anyone, no sense that it
 * could be read. It's here because a bottle photographed against nothing sits
 * in nothing, and the one thing every wine has that the photograph can't show
 * is where it grew.
 *
 * Behind the photograph, which only works because the photograph has a hole
 * in it. See photo-cutout: a studio shot arrives with its cream ground
 * removed, so the outline shows through everywhere the bottle isn't, and the
 * bottle covers the part of the country it stands on.
 *
 * It was briefly drawn over the top instead and multiplied into the picture,
 * on the theory that a dark line multiplied into a near-white ground reads
 * while over dark glass it disappears. Both halves are true and it still
 * failed, because a bottle is not uniformly dark: the label is pale, pale is
 * where multiply bites hardest, and the result was a coastline ruled straight
 * across the writing. Nothing about the blend can be tuned to spare a white
 * label — brightness is the only thing it responds to, and the label's is the
 * same as the ground's.
 *
 * If the picture can't be cut — a real photograph of a bottle on a table has
 * no flat ground to remove — it arrives opaque and this is hidden behind it,
 * which is a decoration quietly missing rather than anything broken.
 *
 * Server-rendered: COUNTRY_SHAPES is a 170KB module that never reaches the
 * browser, and what goes over the wire is the path for this one country.
 */
export default function CountryGhost({
  iso,
  at = null,
}: {
  iso: string | null;
  /** Where in the country, if that's known finely enough to be worth a dot. */
  at?: [number, number] | null;
}) {
  const all = iso ? COUNTRY_SHAPES[iso] : null;
  if (!all) return null;
  const land = mainland(all);

  /*
   * A viewBox with the country's own proportions, so the drawing fills it
   * exactly and the element's width is the country's width.
   */
  let west = 180, south = 90, east = -180, north = -90;
  for (const ring of land) {
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }
  const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180) || 1;
  const view = {
    w: 1000,
    h: Math.round((1000 * (north - south)) / Math.max((east - west) * squeeze, 1e-6)),
  };

  const projection = fit(land, view.w, view.h, 0);
  const dot = at ? projection.project(at[0], at[1]) : null;

  return (
    <svg
      viewBox={`0 0 ${view.w} ${view.h}`}
      /*
       * meet, not slice. Slice scales the country until it covers the frame
       * and crops what hangs off, and a country cropped that hard is
       * unrecognisable — Italy came out as three unrelated fragments at the
       * edges. meet fits the whole outline inside instead.
       */
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {land.map((ring, index) => (
        <path
          key={index}
          d={projection.path(ring)}
          /*
           * A line, not a shape. The bottle covers most of the country — it's
           * an opaque photograph sitting in the middle of it — and a filled
           * country reduces to a few disconnected blobs poking out from behind
           * the picture, which reads as damage. An unfilled outline passing
           * behind the bottle and out the other side is a line interrupted,
           * and the eye joins it up without being asked.
           */
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.2}
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* One mark for where in it. The wine accent, kept quiet enough that it
          reads as a pin rather than as part of the photograph. */}
      {dot && (
        <>
          <circle cx={dot[0]} cy={dot[1]} r={11} fill="var(--color-wine)" fillOpacity={0.09} />
          <circle cx={dot[0]} cy={dot[1]} r={3.2} fill="var(--color-wine)" fillOpacity={0.42} />
        </>
      )}
    </svg>
  );
}
