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

  // Your bottle restaged under studio lighting. Generated, so never automatic:
  // it costs a generation per press and takes about a minute.
  const [studio, setStudio] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);

  const [pick, setPick] = useState<"artwork" | "studio" | "tidy" | "mine">("artwork");

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

  async function makeStudioShot() {
    if (!photo) return;
    setStaging(true);
    setNotice(null);
    try {
      const response = await fetch("/api/photos/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: photo }),
      });
      const payload = (await response.json()) as { generated?: boolean; dataUrl?: string; reason?: string };
      if (payload.generated && payload.dataUrl) {
        setStudio(payload.dataUrl);
        setPick("studio");
      } else {
        setNotice(payload.reason ?? "That photo couldn't be restaged.");
      }
    } catch {
      setNotice("Couldn't reach the server to make a studio shot.");
    }
    setStaging(false);
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
    setStudio(null);
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
  const pictures = {
    artwork: artwork?.dataUrl ?? null,
    studio,
    tidy,
    mine: photo,
  };

  const chosen = (pictures[pick] ? pick : artwork ? "artwork" : studio ? "studio" : tidy ? "tidy" : "mine") as
    | "artwork"
    | "studio"
    | "tidy"
    | "mine";

  const chosenPhoto = pictures[chosen] ?? photo;

  /*
   * Three at most across a phone; a fourth wraps to a second row rather than
   * squeezing every thumbnail down to a stripe.
   */
  const options = [
    artwork ? { id: "artwork" as const, src: artwork.dataUrl, caption: "Product shot" } : null,
    studio ? { id: "studio" as const, src: studio, caption: "Studio, generated" } : null,
    tidy ? { id: "tidy" as const, src: tidy, caption: "Yours, tidied" } : null,
    photo ? { id: "mine" as const, src: photo, caption: "Your photo" } : null,
  ].filter((option) => option !== null);

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

      {photo && options.length < 2 && (
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
                setStudio(null);
              }}
              className="link-quiet"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={makeStudioShot}
              disabled={staging}
              className="link-quiet disabled:opacity-50"
            >
              {staging ? "Restaging…" : "Make a studio shot"}
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
      {photo && (artwork || tidy || studio) && (
        <div>
          <p className="eyebrow mb-3">Which picture?</p>
          <div className={`grid gap-3 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {options
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

          {studio && (
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
              The studio shot is generated from your photo. It keeps the label because it starts
              from the picture rather than the name, but it is a rendering — check the label still
              reads right before you keep it.
            </p>
          )}

          <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <button type="button" onClick={() => fileInput.current?.click()} className="link-quiet">
              Change photo
            </button>
            {!studio && (
              <button
                type="button"
                onClick={makeStudioShot}
                disabled={staging}
                className="link-quiet disabled:opacity-50"
              >
                {staging ? "Restaging…" : "Make a studio shot"}
              </button>
            )}
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
