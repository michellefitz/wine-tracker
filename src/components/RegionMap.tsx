"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fit } from "@/lib/map-projection";
import type { Ring } from "@/lib/map-geometry";

export type PlateBottle = {
  id: string;
  name: string;
  producer: string | null;
  score: number;
};

export type PlateRegion = {
  key: string;
  name: string;
  rings: Ring[];
  /** Empty for a region you've never drunk from — still drawn, still tappable. */
  bottles: PlateBottle[];
};

/**
 * A region of yours the register has no shape for.
 *
 * Two reasons that happens, and both need to stay on the map: the lookup put
 * the bottle somewhere the EU doesn't register — "somewhere in Portugal", or
 * anywhere outside Europe — or it named a place the register spells
 * differently. Either way it's a bottle you drank, and dropping it because we
 * couldn't draw its outline would be the map quietly under-reporting the log.
 */
export type PlateMark = {
  key: string;
  name: string;
  longitude: number;
  latitude: number;
  /** How vague the placement is, in kilometres. Sets the halo. */
  spread: number;
  bottles: PlateBottle[];
};

const BOX = 1000;
/**
 * How far from square a plate is allowed to get.
 *
 * Fitting a square box to the world left half the plate empty above and below
 * the land; fitting one to Italy would leave the same space either side. So the
 * box takes the shape of what's in it — within reason, because a plate as tall
 * as Chile is a plate you can't see the bottom of on a phone.
 */
const ASPECT = { widest: 2.4, tallest: 0.78 };
const MAX_ZOOM = 14;
/** Past this much movement a press was a drag, and a drag is not a tap. */
const DRAG_SLOP = 6;

type View = { x: number; y: number; w: number; h: number };

/**
 * The regions of one country, as ground you can move around on.
 *
 * Every appellation the EU register knows about is drawn, not only the ones
 * you've drunk from — which is the whole point. Seeing that the four bottles
 * you liked sit inside one small shape, with thirty other shapes around it you
 * have never touched, is the thing a list of names cannot tell you. Yours are
 * filled in; the rest are outlines.
 *
 * Panning and zooming move the viewBox rather than re-projecting, so the
 * geometry is laid out once and the browser does the rest on the compositor.
 * Every stroke is non-scaling, or a hairline at 1× becomes a 6px band at 6×
 * and the mosaic turns into a blot.
 */
export default function RegionMap({
  land,
  regions,
  marks = [],
  onSelect,
  selected,
}: {
  land: Ring[];
  regions: PlateRegion[];
  marks?: PlateMark[];
  onSelect: (key: string | null) => void;
  selected: string | null;
}) {
  const svg = useRef<SVGSVGElement>(null);

  /*
   * The plate takes the proportions of the land on it, and the view starts
   * showing all of it.
   */
  const plate = useMemo(() => {
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
    const spanX = Math.max((east - west) * squeeze, 1e-6);
    const spanY = Math.max(north - south, 1e-6);
    const ratio = Math.min(1 / ASPECT.tallest, Math.max(1 / ASPECT.widest, spanY / spanX));
    return { w: BOX, h: Math.round(BOX * ratio) };
  }, [land]);

  const [view, setView] = useState<View>({ x: 0, y: 0, w: plate.w, h: plate.h });

  /*
   * How many view units one screen pixel is worth.
   *
   * Everything drawn at a fixed size on screen — a dot, a label — has to be
   * expressed in these, because the viewBox shrinks as you zoom and a constant
   * in view units grows to match. Getting this wrong is not subtle and was:
   * every dot on the world map came out under two pixels across, and every
   * label at four.
   */
  const [pxWidth, setPxWidth] = useState(360);
  useEffect(() => {
    const node = svg.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setPxWidth(width);
    });
    watch.observe(node);
    return () => watch.disconnect();
  }, []);
  const unit = view.w / pxWidth;

  /*
   * Fitted to the coastline, not to the appellations. A country's wine is
   * never spread evenly across it, and fitting to the regions alone would zoom
   * Portugal onto the Douro and leave you wondering which country you were
   * looking at.
   */
  const projection = useMemo(() => fit(land, plate.w, plate.h, 18), [land, plate]);

  const shapes = useMemo(
    () =>
      regions.map((region) => ({
        region,
        d: region.rings.map((ring) => projection.path(ring)).join(" "),
        centre: centreOf(region.rings, projection.project),
      })),
    [regions, projection],
  );

  const coast = useMemo(() => land.map((ring) => projection.path(ring)), [land, projection]);

  /* Kilometres to view units, from the projection's own scale, so a halo means
     the same thing on a small country as on a large one. */
  const dots = useMemo(() => {
    const [ax] = projection.project(0, 0);
    const [bx] = projection.project(1, 0);
    const perDegree = Math.abs(bx - ax) || 1;
    return marks.map((mark) => {
      const [x, y] = projection.project(mark.longitude, mark.latitude);
      return {
        mark,
        x,
        y,
        /* Screen pixels. The halo is a real distance, so it stays in view
           units and grows on screen as you zoom into it — which is the point:
           it says "somewhere in here", and "here" is a place on the map. */
        radius: 4 + Math.min(mark.bottles.length, 12) * 1.1,
        halo: (mark.spread / 111) * perDegree,
      };
    });
  }, [marks, projection]);

  /* ------------------------------------------------------------ gestures */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startView: null as View | null, startSpan: 0, startMid: { x: 0, y: 0 } });

  /** Client pixels to view units — the whole reason a drag tracks the finger. */
  const perPixel = useCallback(() => {
    const box = svg.current?.getBoundingClientRect();
    return box && box.width ? view.w / box.width : 1;
  }, [view.w]);

  const clamp = useCallback((next: View): View => {
    const w = Math.min(plate.w, Math.max(plate.w / MAX_ZOOM, next.w));
    const h = w * (next.h / next.w || 1);
    /*
     * Half a screen of overscroll in each direction, deliberately. Pinning the
     * edges exactly makes a zoomed-in corner impossible to centre, and a map
     * you can't get the corner of feels broken in a way an empty margin
     * doesn't.
     */
    const slack = { x: w / 2, y: h / 2 };
    return {
      w,
      h,
      x: Math.min(plate.w - w + slack.x, Math.max(-slack.x, next.x)),
      y: Math.min(plate.h - h + slack.y, Math.max(-slack.y, next.y)),
    };
  }, [plate]);

  /** Zoom about a fixed point in client coordinates, so the map grows under the finger. */
  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const box = svg.current?.getBoundingClientRect();
      if (!box) return;
      setView((current) => {
        const w = Math.min(plate.w, Math.max(plate.w / MAX_ZOOM, current.w / factor));
        const scale = w / current.w;
        const fx = (clientX - box.left) / box.width;
        const fy = (clientY - box.top) / box.height;
        return clamp({
          w,
          h: current.h * scale,
          x: current.x + (current.w - w) * fx,
          y: current.y + (current.h - current.h * scale) * fy,
        });
      });
    },
    [clamp, plate],
  );

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current.moved = 0;
    gesture.current.startView = view;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startSpan = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.startMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const span = Math.hypot(a.x - b.x, a.y - b.y);
      const start = gesture.current.startSpan || span;
      if (span > 0 && start > 0) {
        gesture.current.startSpan = span;
        zoomAt(span / start, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      return;
    }

    const unit = perPixel();
    setView((current) => clamp({ ...current, x: current.x - dx * unit, y: current.y - dy * unit }));
  }

  function endPointer(event: React.PointerEvent<SVGSVGElement>) {
    const last = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current.startSpan = 0;

    // A press that went nowhere is a tap. Anything else was the map being moved.
    if (last && event.type === "pointerup" && gesture.current.moved <= DRAG_SLOP) {
      const key = pickAt(event.clientX, event.clientY);
      onSelect(key && key === selected ? null : key);
    }
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, event.clientX, event.clientY);
  }

  /**
   * What was under the finger when it came up.
   *
   * Not an onClick on each shape, which is where this started and doesn't
   * work: the svg captures the pointer so that a drag survives leaving the
   * map, and a captured pointer retargets every later event — including the
   * click — to the element holding the capture. Every tap arrived at the svg
   * and no region was ever selected. Hit-testing the point is geometry rather
   * than event routing, so the capture can't interfere with it.
   */
  function pickAt(clientX: number, clientY: number): string | null {
    let node = document.elementFromPoint(clientX, clientY) as Element | null;
    while (node && node !== svg.current) {
      const key = node.getAttribute?.("data-region");
      if (key) return key;
      node = node.parentElement;
    }
    return null;
  }

  const zoom = plate.w / view.w;

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        /*
          Height from the aspect ratio, never set directly. An SVG whose box
          doesn't match its viewBox letterboxes the drawing inside it — which
          is what put a band of empty paper above and below the world map, and
          what makes a measured pixel width mean nothing.
        */
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${plate.w} / ${plate.h}`,
          display: "block",
          touchAction: "none",
          cursor: "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        role="img"
        aria-label="Map of this country's wine regions"
      >
        {coast.map((d, index) => (
          <path
            key={index}
            d={d}
            fill="var(--color-tint)"
            stroke="var(--color-rule)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}

        {/*
          Drawn in two passes so yours are never underneath someone else's
          outline. Appellations nest — Barolo sits inside Langhe sits inside
          Piemonte — so paint order is the only thing deciding what you can see
          and what you can hit.
        */}
        {shapes
          .filter(({ region }) => region.bottles.length === 0)
          .map(({ region, d }) => (
            <path
              key={region.key}
              d={d}
              fill="transparent"
              stroke="var(--color-muted)"
              strokeOpacity={0.4}
              strokeWidth={0.75}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              data-region={region.key}
              style={{ cursor: "pointer" }}
            >
              <title>{region.name}</title>
            </path>
          ))}

        {shapes
          .filter(({ region }) => region.bottles.length > 0)
          .map(({ region, d }) => {
            const chosen = selected === region.key;
            return (
              <path
                key={region.key}
                d={d}
                fill="var(--color-wine)"
                fillOpacity={chosen ? 0.42 : 0.2}
                stroke={chosen ? "var(--color-ink)" : "var(--color-wine)"}
                strokeWidth={chosen ? 1.8 : 1.1}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                data-region={region.key}
                style={{ cursor: "pointer" }}
              >
                <title>{`${region.name} — ${bottleCount(region.bottles.length)}`}</title>
              </path>
            );
          })}

        {dots.map(({ mark, x, y, radius, halo }) => {
          const chosen = selected === mark.key;
          const dot = radius * unit;
          return (
            <g key={mark.key} data-region={mark.key} style={{ cursor: "pointer" }}>
              <title>{`${mark.name} — ${bottleCount(mark.bottles.length)}`}</title>
              <circle
                cx={x}
                cy={y}
                r={Math.max(halo, dot + 2 * unit)}
                fill="var(--color-wine)"
                fillOpacity={chosen ? 0.28 : 0.14}
              />
              <circle
                cx={x}
                cy={y}
                r={dot}
                fill="var(--color-wine)"
                stroke={chosen ? "var(--color-ink)" : "var(--color-paper)"}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {/*
          Names for the ones that are yours, and only once there's room for
          them. At 1× a country with a dozen marked regions is a pile of
          overlapping words; the labels arrive as you zoom in, which is also
          when you're asking what something is called.
        */}
        {zoom > 1.4 &&
          [
            ...shapes
              .filter(({ region }) => region.bottles.length > 0)
              .map(({ region, centre }) => ({ key: region.key, name: region.name, centre })),
            ...dots.map(({ mark, x, y, halo, radius }) => ({
              key: mark.key,
              name: mark.name,
              centre: [x, y + Math.max(halo, radius * unit) + 13 * unit] as [number, number],
            })),
          ].map((region) => (
              <text
                key={region.key}
                x={region.centre[0]}
                y={region.centre[1]}
                textAnchor="middle"
                fontSize={11 * unit}
                fontWeight={500}
                fill="var(--color-ink)"
                stroke="var(--color-paper)"
                strokeWidth={3.5 * unit}
                paintOrder="stroke"
                style={{ pointerEvents: "none" }}
              >
                {region.name}
              </text>
            ))}
      </svg>

      {/* Buttons as well as the gesture: a trackpad has no pinch, and a zoom
          you can only reach by pinching is a zoom half the app can't reach. */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <MapButton label="Zoom in" onPress={() => zoomAt(1.5, midX(svg), midY(svg))}>+</MapButton>
        <MapButton label="Zoom out" onPress={() => zoomAt(1 / 1.5, midX(svg), midY(svg))}>−</MapButton>
        <MapButton
          label="Fit the whole country"
          onPress={() => {
            setView({ x: 0, y: 0, w: plate.w, h: plate.h });
            onSelect(null);
          }}
        >
          ⤢
        </MapButton>
      </div>
    </div>
  );
}

function bottleCount(count: number): string {
  return count === 1 ? "1 bottle" : `${count} bottles`;
}

function MapButton({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-8 items-center justify-center border border-rule bg-paper/90
        text-[0.875rem] text-ink-soft backdrop-blur transition-colors
        pointer-hover:hover:border-ink"
    >
      {children}
    </button>
  );
}

function midX(ref: React.RefObject<SVGSVGElement | null>): number {
  const box = ref.current?.getBoundingClientRect();
  return box ? box.left + box.width / 2 : 0;
}

function midY(ref: React.RefObject<SVGSVGElement | null>): number {
  const box = ref.current?.getBoundingClientRect();
  return box ? box.top + box.height / 2 : 0;
}

/**
 * Where a region's name goes: the middle of its bounding box, on its largest
 * ring alone. An area-weighted centroid is the textbook answer and it's the
 * wrong one here — for a region shaped like a crescent it lands in the sea.
 */
function centreOf(rings: Ring[], project: (lon: number, lat: number) => [number, number]): [number, number] {
  const ring = rings[0] ?? [];
  let west = 180, south = 90, east = -180, north = -90;
  for (const [lon, lat] of ring) {
    if (lon < west) west = lon;
    if (lon > east) east = lon;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  if (east < west) return [0, 0];
  return project((west + east) / 2, (south + north) / 2);
}
