import type { Ring } from "@/lib/map-geometry";

/**
 * Longitude and latitude onto an SVG box.
 *
 * Equirectangular with the horizontal axis squeezed by the cosine of the middle
 * latitude, which is enough to keep a country the shape people recognise at
 * this size — Italy stays Italy, and Norway does not become a smear. A real
 * conic would be better for a wide country and is not worth the arithmetic for
 * a map you look at rather than measure on.
 */

export type Projection = {
  project: (lon: number, lat: number) => [number, number];
  /** The ring as an SVG path, closed. */
  path: (ring: Ring) => string;
  width: number;
  height: number;
};

export function fit(rings: Ring[], width: number, height: number, pad = 14): Projection {
  let west = 180, south = 90, east = -180, north = -90;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }
  // A single point, or nothing: give it a degree of room so the maths holds.
  if (!(east > west)) { west -= 1; east += 1; }
  if (!(north > south)) { south -= 1; north += 1; }

  const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const spanX = (east - west) * squeeze;
  const spanY = north - south;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const project = (lon: number, lat: number): [number, number] => [
    +(offsetX + (lon - west) * squeeze * scale).toFixed(1),
    +(offsetY + (north - lat) * scale).toFixed(1),
  ];

  return {
    project,
    path: (ring) => "M" + ring.map(([lon, lat]) => project(lon, lat).join(" ")).join("L") + "Z",
    width,
    height,
  };
}
