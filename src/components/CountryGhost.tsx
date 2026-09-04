import { COUNTRY_SHAPES, type Ring } from "@/lib/map-geometry";
import { fit } from "@/lib/map-projection";

/**
 * How wide the country is drawn, against the frame around the bottle.
 *
 * Sized to the bottle rather than fitted to a box, which is the whole
 * difference between Italy reading and Spain not. Fitting a wide, squat
 * country into a tall frame leaves it small and entirely behind the
 * photograph; fitting a tall one leaves it thin. Scaling every country to the
 * same width instead means each one is always about half again the width of
 * the bottle, and it's the frame that crops whatever hangs off.
 *
 * Wider than the bottle, narrower than the frame — and it has to be both.
 *
 * Narrower than the bottle and the outline is simply behind the photograph.
 * Wider than the frame and its two coasts fall off the sides, which for a
 * country with no fill leaves nothing at all in between: Portugal drawn at
 * 108% put both its coastlines just outside the frame and its interior is
 * empty, so the whole country came out as four short scratches.
 *
 * 96% of the frame against a bottle at about 68% of it leaves a clear channel
 * either side, wide enough for a coastline to live in. This number and the
 * bottle's width were settled together, by looking at Italy, Spain, France,
 * Portugal and Argentina.
 */
const WIDTH = "96%";

/**
 * The ceiling, for countries that are mostly length. Chile is real.
 *
 * Generous, because this clamp is what made Portugal and Argentina read as
 * scratches: at 150% both were being shrunk to fit it, which narrowed them to
 * less than the bottle and left nothing either side. Both are about 175% tall
 * once scaled to width, so the ceiling sits above them and catches only the
 * genuinely absurd — Chile comes out at 445%.
 */
const TALLEST = "200%";

/*
 * Centred, and nudging it sideways was tried and undone.
 *
 * The idea was that a country centred behind the photograph is hidden along
 * exactly the axis it most needs to be seen on, which is true, and that a
 * tall narrow one — Portugal, Chile — is the same shape as the bottle and all
 * but disappears, which is also true. But the offset takes as much as it
 * gives: at 13% it pushed Italy's east coast behind the bottle and the Barolo
 * mark clean off the frame, to buy Portugal a strip of coastline that still
 * didn't read as Portugal.
 *
 * So: centred. Countries with some width to them — Italy, France, Spain,
 * Argentina, Germany — read well around the bottle. Ones shaped like the
 * bottle read as a suggestion, and that is the honest limit of drawing a
 * country behind an opaque photograph of something tall and narrow.
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
 * Deliberately larger than the frame and cropped by it. The studio shots are
 * opaque — cream all the way to the edge — so anything the same size as the
 * photo would be entirely hidden behind it. Oversized and bled off the sides,
 * the outline reads around the bottle instead of under it, and cropping is
 * what stops it looking like a diagram someone forgot to label.
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
       * meet, not slice. Slice scales the country until it covers the frame,
       * and a country cropped that hard is unrecognisable — Italy came out as
       * three unrelated fragments at the edges. The frame is shaped to give
       * the outline room instead; see the wrapper in WineDetail.
       */
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ width: WIDTH, maxHeight: TALLEST }}
      className="pointer-events-none absolute left-1/2 top-1/2 h-auto -translate-x-1/2
        -translate-y-1/2"
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
