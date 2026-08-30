"use client";

import { useRouter } from "next/navigation";
import RegionMap, { type PlateMark } from "@/components/RegionMap";
import type { Ring } from "@/lib/map-geometry";

/**
 * The whole log at once, on the same map the countries use.
 *
 * No polygons here — the EU register draws appellations, not countries, and a
 * world map at this size has no room for either. What it has is the same
 * ground and the same gestures, so zooming into Europe on the overview and
 * zooming into Piemonte on the Italy plate are one thing you learn once.
 *
 * Selecting a country goes there rather than opening a panel: the country
 * plate is the panel, and it's a page.
 */
export default function WorldMap({ land, marks }: { land: Ring[]; marks: PlateMark[] }) {
  const router = useRouter();

  return (
    <RegionMap
      land={land}
      regions={[]}
      marks={marks}
      selected={null}
      onSelect={(key) => {
        if (key) router.push(`/map/${key.toLowerCase()}`);
      }}
    />
  );
}
