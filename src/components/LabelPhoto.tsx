"use client";

import { useEffect, useRef, useState } from "react";
import BottlePlaceholder from "@/components/BottlePlaceholder";

/**
 * The label photo, with the drawn bottle as its safety net.
 *
 * A photo can fail to arrive for reasons that have nothing to do with the wine
 * — the row is gone, the network dropped, the phone is offline. The browser's
 * answer to that is a broken-image glyph, which looks like the app is broken.
 * The placeholder is already what a bottle with no photo shows, so falling back
 * to it means the worst case looks deliberate rather than snapped.
 */
export default function LabelPhoto({
  photoId,
  alt,
  width,
  className = "",
  eager = false,
  draggable,
}: {
  photoId: string | null;
  alt: string;
  /** One of the sizes the photo route will actually resize to. */
  width: 560 | 960;
  className?: string;
  eager?: boolean;
  /**
   * Pass false inside anything you swipe. An image is a drag source by
   * default, so on a shelf you pull sideways the browser starts dragging the
   * picture instead of scrolling, and marks it selected while it does.
   */
  draggable?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  /*
   * onError alone isn't enough. These are server-rendered, so the browser can
   * request the photo and give up on it well before React hydrates and attaches
   * a handler — and a failure nobody was listening for leaves the broken glyph
   * on screen for good. A finished image with no width is one that failed.
   */
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) setFailed(true);
  }, []);

  if (!photoId || failed) return <BottlePlaceholder />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={image}
      src={`/api/photos/${photoId}?w=${width}`}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "sync" : "async"}
      onError={() => setFailed(true)}
      draggable={draggable}
      className={className}
    />
  );
}
