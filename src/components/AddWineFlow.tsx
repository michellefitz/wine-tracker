"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ReadingLabel } from "@/components/Loaders";
import WineForm from "@/components/WineForm";
import { fileToCompressedDataUrl } from "@/lib/image";
import type { LabelReading } from "@/lib/types";

type Stage = "capture" | "reading" | "form";

type Artwork = { dataUrl: string; label: string };

export default function AddWineFlow() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // A cleaner product shot, if one can be found and verified against the photo.
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Your own photo, cropped to the bottle and lifted off its background.
  const [tidy, setTidy] = useState<string | null>(null);
  const [tidying, setTidying] = useState(false);

  const [pick, setPick] = useState<"artwork" | "tidy" | "mine">("artwork");

  /** Runs after the label is read, in the background — it must never block saving. */
  async function lookUpArtwork(dataUrl: string, result: LabelReading) {
    if (!result.name && !result.producer) return;
    setLookingUp(true);
    try {
      const response = await fetch("/api/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          producer: result.producer,
          name: result.name,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          found: boolean;
          dataUrl?: string;
          label?: string;
        };
        if (payload.found && payload.dataUrl) {
          setArtwork({ dataUrl: payload.dataUrl, label: payload.label ?? "Product shot" });
        }
      }
    } catch {
      // No product shot is a normal outcome, not an error worth surfacing.
    }
    setLookingUp(false);
  }

  /**
   * Runs alongside the product-shot lookup, on the photo you took.
   *
   * Independent of it on purpose: the lookup finds nothing for most small
   * growers, and this works on every bottle because it only needs the picture
   * already in your hand.
   */
  async function tidyUp(dataUrl: string) {
    setTidying(true);
    try {
      const response = await fetch("/api/photos/tidy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { dataUrl?: string; cutOut?: boolean };
        // A crop alone isn't worth a third thumbnail to choose between; the
        // background coming off is a visibly different picture.
        if (payload.dataUrl && payload.cutOut) setTidy(payload.dataUrl);
      }
    } catch {
      // Not being able to tidy up is a normal outcome, not an error to report.
    }
    setTidying(false);
  }

  async function onPhotoChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a change
    if (!file) return;

    setNotice(null);

    let dataUrl: string;
    try {
      dataUrl = await fileToCompressedDataUrl(file);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't read that photo.");
      return;
    }

    setPhoto(dataUrl);
    setArtwork(null);
    setTidy(null);
    setPick("artwork");
    setStage("reading");
    void tidyUp(dataUrl);

    try {
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setNotice(payload.error ?? "Couldn't read the label. Fill it in by hand.");
      } else {
        const result = (await response.json()) as LabelReading;
        if (result.is_wine_label) {
          setReading(result);
          if (result.confidence === "low") {
            setNotice("The label was hard to read — worth checking these details.");
          }
          void lookUpArtwork(dataUrl, result);
        } else {
          setNotice(result.note ?? "That didn't look like a wine label. Fill it in by hand.");
        }
      }
    } catch {
      setNotice("Couldn't reach the label reader. Fill it in by hand.");
    }

    setStage("form");
  }

  /*
   * What's actually selected. Held as a fallback chain rather than corrected
   * in an effect, because both pictures arrive on their own schedule after the
   * form is already on screen: preferring the product shot when there is one
   * means the default doesn't jump around as the lookups land.
   */
  const chosen: "artwork" | "tidy" | "mine" =
    pick === "artwork" && artwork ? "artwork" : pick === "tidy" && tidy ? "tidy" : pick === "mine" ? "mine" : artwork ? "artwork" : tidy ? "tidy" : "mine";

  const chosenPhoto = chosen === "artwork" ? (artwork?.dataUrl ?? photo) : chosen === "tidy" ? (tidy ?? photo) : photo;

  return (
    <div className="space-y-7">
      {/*
        No `capture` attribute on purpose. It forces the camera straight open,
        which is wrong when the bottle is already in your camera roll — you
        photographed it in the shop and are logging it at home. Without it, iOS
        and Android put up their own chooser offering the library, the camera
        and files, which is a better menu than anything drawn here and one
        people already know how to use.
      */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPhotoChosen}
      />

      {photo && !artwork && !tidy && (
        <div className="flex items-end gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="The label you chose"
            className="aspect-4/5 w-28 shrink-0 bg-tint object-cover"
          />
          <div className="flex flex-col items-start gap-2 pb-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="link-quiet"
            >
              Change photo
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setReading(null);
                setArtwork(null);
                setTidy(null);
              }}
              className="link-quiet"
            >
              Remove
            </button>
            {(lookingUp || tidying) && (
              <span className="eyebrow">{lookingUp ? "Looking for a product shot…" : "Tidying up…"}</span>
            )}
          </div>
        </div>
      )}

      {/*
        Whichever pictures we managed to come up with, side by side at the size
        they'll actually be seen. A product shot is only offered once it's been
        checked against your photo, and a tidied version only once the
        background actually came off — a plain crop isn't a different enough
        picture to be worth a decision.
      */}
      {photo && (artwork || tidy) && (
        <div>
          <p className="eyebrow mb-3">Which picture?</p>
          <div className={`grid gap-3 ${artwork && tidy ? "grid-cols-3" : "grid-cols-2"}`}>
            {[
              artwork ? { id: "artwork" as const, src: artwork.dataUrl, caption: "Product shot" } : null,
              tidy ? { id: "tidy" as const, src: tidy, caption: "Yours, tidied" } : null,
              { id: "mine" as const, src: photo, caption: "Your photo" },
            ]
              .filter((option) => option !== null)
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPick(option.id)}
                  className="text-left transition-transform duration-[160ms]
                    ease-out-strong active:scale-[0.98]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.src}
                    alt={option.caption}
                    className={`aspect-4/5 w-full bg-tint object-contain transition-opacity
                      duration-[160ms] ease-out-strong ${
                        chosen === option.id ? "ring-1 ring-ink" : "opacity-55"
                      }`}
                  />
                  <span
                    className={`mt-2 block text-[0.6875rem] font-medium uppercase tracking-[0.14em] ${
                      chosen === option.id ? "text-ink" : "text-muted"
                    }`}
                  >
                    {option.caption}
                  </span>
                </button>
              ))}
          </div>

          {artwork && (
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
              The product shot is matched to “{artwork.label}” from Open Food Facts. If that
              isn&apos;t your bottle, keep one of your own.
            </p>
          )}

          <p className="mt-3 flex items-baseline gap-5">
            <button type="button" onClick={() => fileInput.current?.click()} className="link-quiet">
              Change photo
            </button>
            {(lookingUp || tidying) && (
              <span className="eyebrow">{lookingUp ? "Still looking…" : "Tidying up…"}</span>
            )}
          </p>
        </div>
      )}

      {stage === "capture" && (
        <div className="border-t border-rule pt-10 text-center">
          <p className="mx-auto max-w-xs essay text-[1.5rem] leading-snug text-ink">
            Start with the label.
          </p>
          <p className="mx-auto mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
            Take a photo now, or pick one you already have. The producer, vintage
            and region get filled in for you; anything that comes back wrong is
            yours to fix.
          </p>
          <button
            type="button"
            className="btn-ink mt-7 w-full max-w-xs"
            onClick={() => fileInput.current?.click()}
          >
            Add a photo
          </button>
          <p className="mt-5">
            <button
              type="button"
              className="link-quiet"
              onClick={() => setStage("form")}
            >
              Skip — I&apos;ll type it in
            </button>
          </p>
        </div>
      )}

      {stage === "reading" && (
        <div className="border-t border-rule py-8">
          <ReadingLabel caption="Reading the label…" />
        </div>
      )}

      {notice && stage === "form" && (
        <p className="bg-tint px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          {notice}
        </p>
      )}

      {stage === "form" && (
        <WineForm mode="create" reading={reading} photoDataUrl={chosenPhoto} />
      )}

      {stage !== "form" && (
        <p className="text-center">
          <Link href="/" className="link-quiet">
            Back to the log
          </Link>
        </p>
      )}
    </div>
  );
}
