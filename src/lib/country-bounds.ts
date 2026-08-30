/**
 * Where each wine-producing country is, and where its wine is.
 *
 * Two jobs. `box` is the mainland bounding box, used to sanity-check a
 * coordinate: a lookup that places a Barolo in China is a lookup to throw away,
 * and that is not hypothetical — geocoding "Langhe" against OpenStreetMap
 * really does return a place in Hubei. `centre` is where a bottle lands when
 * all we know is the country.
 *
 * Those centres are not geometric. A bottle that says only "USA" belongs over
 * Napa, not over Kansas; only "Australia" belongs over the Barossa, not over
 * the middle of the desert. For countries whose vineyards sit far from their
 * centre of area the point is set by hand — the fallback should be vague, not
 * wrong.
 *
 * Boxes and unset centres are derived from Natural Earth 1:50m via world-atlas,
 * taking each country's largest ring so overseas territories don't stretch the
 * box across an ocean.
 */

export type CountryBounds = {
  /** [west, south, east, north] of the mainland. */
  box: [number, number, number, number];
  /** [lon, lat] — the middle of the country's wine, not of the country. */
  centre: [number, number];
};

export const COUNTRY_BOUNDS: Record<string, CountryBounds> = {
  AL: { box: [19.28, 39.65, 21.03, 42.65], centre: [20.1, 41.09] },
  AM: { box: [43.44, 38.87, 46.59, 41.29], centre: [45.22, 40.13] },
  AR: { box: [-73.58, -52.36, -53.67, -21.8], centre: [-68.8, -33] },
  AT: { box: [9.52, 46.4, 17.15, 49], centre: [13.45, 47.57] },
  AU: { box: [113.18, -39.15, 153.62, -10.71], centre: [138.9, -34.6] },
  AZ: { box: [45, 38.4, 50.37, 41.89], centre: [47.27, 40.29] },
  BA: { box: [15.74, 42.56, 19.58, 45.28], centre: [18.14, 44.06] },
  BE: { box: [2.53, 49.51, 6.36, 51.49], centre: [4.72, 50.59] },
  BG: { box: [22.34, 41.24, 28.59, 44.24], centre: [24.96, 42.61] },
  BO: { box: [-69.64, -22.89, -57.49, -9.71], centre: [-65.3, -21.5] },
  BR: { box: [-74, -33.74, -34.81, 5.26], centre: [-51.5, -29.2] },
  CA: { box: [-141, 41.68, -55.67, 71.99], centre: [-119.5, 49.8] },
  CH: { box: [5.97, 45.83, 10.46, 47.78], centre: [8.31, 46.74] },
  CL: { box: [-75.71, -53.88, -67.01, -17.51], centre: [-71, -34.6] },
  CN: { box: [73.61, 20.26, 134.75, 53.56], centre: [105.2, 38.5] },
  CY: { box: [32.3, 34.57, 34.05, 35.18], centre: [33.21, 34.95] },
  CZ: { box: [12.09, 48.58, 18.83, 51.04], centre: [15.44, 49.88] },
  DE: { box: [5.86, 47.28, 15.02, 54.9], centre: [10.26, 50.69] },
  DZ: { box: [-8.69, 18.99, 11.97, 37.09], centre: [1.79, 29.23] },
  EG: { box: [24.7, 21.99, 36.87, 31.65], centre: [30.9, 30.9] },
  ES: { box: [-9.24, 36.03, 3.31, 43.77], centre: [-3.96, 40.92] },
  FR: { box: [-4.76, 42.34, 8.14, 51.1], centre: [2.65, 46.61] },
  GB: { box: [-6.13, 50.02, 1.75, 58.65], centre: [-3.21, 54.23] },
  GE: { box: [39.98, 41.07, 46.67, 43.57], centre: [43.85, 42.06] },
  GR: { box: [20, 36.45, 26.62, 41.74], centre: [22.99, 39.43] },
  HR: { box: [13.52, 42.94, 19.4, 46.53], centre: [16.6, 45.12] },
  HU: { box: [16.09, 45.75, 22.88, 48.55], centre: [19.42, 47.23] },
  IE: { box: [-10.39, 51.47, -6.03, 55.37], centre: [-8.39, 53.48] },
  IL: { box: [34.25, 29.48, 35.91, 33.43], centre: [35.21, 31.89] },
  IN: { box: [68.16, 8.08, 97.34, 35.5], centre: [73.8, 20] },
  IT: { box: [6.63, 37.94, 18.48, 47.08], centre: [11.9, 43.86] },
  JP: { box: [130.89, 33.49, 141.99, 41.5], centre: [138.6, 35.7] },
  KR: { box: [126.16, 34.31, 129.57, 38.62], centre: [127.37, 36.09] },
  LB: { box: [35.11, 33.07, 36.59, 34.68], centre: [35.97, 33.86] },
  LU: { box: [5.73, 49.45, 6.49, 50.17], centre: [6.06, 49.76] },
  MA: { box: [-17, 21.42, -1.06, 35.93], centre: [-9.01, 28.5] },
  MD: { box: [26.62, 45.45, 30.13, 48.48], centre: [28.53, 47.08] },
  ME: { box: [18.44, 41.87, 20.35, 43.54], centre: [19.26, 42.82] },
  MK: { box: [20.45, 40.85, 23.01, 42.36], centre: [21.64, 41.63] },
  MT: { box: [14.35, 35.82, 14.57, 35.98], centre: [14.47, 35.88] },
  MX: { box: [-117.13, 14.54, -86.77, 32.72], centre: [-116.6, 32] },
  NL: { box: [3.45, 50.75, 7.2, 53.44], centre: [5.59, 51.81] },
  NZ: { box: [166.48, -46.63, 174.37, -40.49], centre: [173.8, -41.5] },
  PE: { box: [-81.34, -18.35, -68.69, -0.04], centre: [-75.7, -13.9] },
  PL: { box: [14.13, 49.02, 24.1, 54.84], centre: [19.1, 51.4] },
  PT: { box: [-9.48, 37.01, -6.21, 42.14], centre: [-7.89, 39.96] },
  RO: { box: [20.24, 43.67, 29.71, 48.26], centre: [24.53, 45.84] },
  RS: { box: [18.84, 42.24, 22.98, 46.17], centre: [20.76, 44.25] },
  RU: { box: [-180, 41.2, 179.87, 77.73], centre: [39.5, 45] },
  SI: { box: [13.38, 45.43, 16.52, 46.86], centre: [14.84, 46.12] },
  SK: { box: [16.86, 47.76, 22.54, 49.6], centre: [19.62, 48.84] },
  TH: { box: [97.38, 5.64, 105.64, 20.42], centre: [100.82, 13.81] },
  TN: { box: [7.5, 30.23, 11.54, 37.34], centre: [9.77, 34.24] },
  TR: { box: [26.09, 35.83, 44.82, 42.06], centre: [35.78, 38.64] },
  UA: { box: [22.13, 45.23, 40.13, 52.35], centre: [30.99, 48.76] },
  US: { box: [-124.71, 25.13, -66.99, 49.37], centre: [-121.5, 38.3] },
  UY: { box: [-58.44, -34.93, -53.12, -30.1], centre: [-56.02, -32.3] },
  ZA: { box: [16.45, -34.79, 32.88, -22.15], centre: [19, -33.8] },
};
