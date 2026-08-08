"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
  const [useArtwork, setUseArtwork] = useState(true);

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

  async function onPhotoChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a retake
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
    setStage("reading");

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

  return (
    <div className="space-y-7">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhotoChosen}
      />

      {photo && !artwork && (
        <div className="flex items-end gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="The label you photographed"
            className="aspect-4/5 w-28 shrink-0 bg-tint object-cover"
          />
          <div className="flex flex-col items-start gap-2 pb-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="link-quiet"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setReading(null);
                setArtwork(null);
              }}
              className="link-quiet"
            >
              Remove
            </button>
            {lookingUp && <span className="eyebrow">Looking for a product shot…</span>}
          </div>
        </div>
      )}

      {photo && artwork && (
        <div>
          <p className="eyebrow mb-3">Which picture?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "artwork", src: artwork.dataUrl, caption: "Product shot", on: useArtwork },
              { id: "mine", src: photo, caption: "Your photo", on: !useArtwork },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setUseArtwork(option.id === "artwork")}
                className="text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.src}
                  alt={option.caption}
                  className={`aspect-4/5 w-full bg-tint object-contain transition ${
                    option.on ? "ring-1 ring-ink" : "opacity-55"
                  }`}
                />
                <span
                  className={`mt-2 block text-[0.6875rem] font-medium uppercase tracking-[0.14em] ${
                    option.on ? "text-ink" : "text-muted"
                  }`}
                >
                  {option.caption}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
            Matched to “{artwork.label}” from Open Food Facts. If that isn&apos;t your
            bottle, keep your own photo.
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="link-quiet mt-3"
          >
            Retake
          </button>
        </div>
      )}

      {stage === "capture" && (
        <div className="border-t border-rule pt-10 text-center">
          <p className="mx-auto max-w-xs serif-display text-[1.75rem] leading-snug text-ink">
            Photograph the label.
          </p>
          <p className="mx-auto mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
            The producer, vintage and region get filled in for you. Anything that comes
            back wrong is yours to fix.
          </p>
          <button
            type="button"
            className="btn-ink mt-7 w-full max-w-xs"
            onClick={() => fileInput.current?.click()}
          >
            Take a photo
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
        <p className="border-t border-rule py-10 text-center eyebrow">
          Reading the label…
        </p>
      )}

      {notice && stage === "form" && (
        <p className="border-l-2 border-rule pl-4 text-[0.9375rem] leading-relaxed text-muted">
          {notice}
        </p>
      )}

      {stage === "form" && (
        <WineForm
          mode="create"
          reading={reading}
          photoDataUrl={artwork && useArtwork ? artwork.dataUrl : photo}
        />
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
