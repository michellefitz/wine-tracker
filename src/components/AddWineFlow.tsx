"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ReadingLabel } from "@/components/Loaders";
import WineForm from "@/components/WineForm";
import { fileToCompressedDataUrl } from "@/lib/image";
import type { LabelReading } from "@/lib/types";

type Stage = "capture" | "reading" | "form";

export default function AddWineFlow() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /*
   * The studio shot now runs on its own as soon as there's a photo, because it
   * turned out to be the right answer nearly every time and asking first was
   * just a tap between you and the picture you were going to pick anyway.
   *
   * Your own photo is still kept and still offered, for the times it isn't:
   * this is a rendering, and the label is the one thing in it that has to be
   * right. "Try again" re-rolls, because the same photo does not give the same
   * result twice and a bad one is usually only bad once.
   */
  const [studio, setStudio] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [studioTrouble, setStudioTrouble] = useState<string | null>(null);
  const [useStudio, setUseStudio] = useState(true);

  async function makeStudioShot(dataUrl: string) {
    setStaging(true);
    setStudioTrouble(null);
    try {
      const response = await fetch("/api/photos/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const payload = (await response.json()) as {
        generated?: boolean;
        dataUrl?: string;
        reason?: string;
      };
      if (payload.generated && payload.dataUrl) {
        setStudio(payload.dataUrl);
        setUseStudio(true);
      } else {
        setStudioTrouble(payload.reason ?? "No studio shot came back.");
      }
    } catch {
      setStudioTrouble("Couldn't reach the server to make a studio shot.");
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
    setStudio(null);
    setStudioTrouble(null);
    setStage("reading");

    // Alongside the label reading, not after it: neither needs the other, and
    // together they're the length of the slower one rather than the sum.
    void makeStudioShot(dataUrl);

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
        } else {
          setNotice(result.note ?? "That didn't look like a wine label. Fill it in by hand.");
        }
      }
    } catch {
      setNotice("Couldn't reach the label reader. Fill it in by hand.");
    }

    setStage("form");
  }

  const chosen = studio && useStudio ? studio : photo;

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

      {photo && (
        <div>
          {/*
            One picture at the size it will actually be seen, rather than a row
            of thumbnails to choose between. There is a right answer here now,
            and it's on screen; the alternative is a line of text underneath.
          */}
          <div className="mx-auto aspect-4/5 w-full max-w-[15rem] overflow-hidden bg-tint">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chosen ?? photo}
              alt="The label for this bottle"
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                staging ? "opacity-40" : "opacity-100"
              }`}
            />
          </div>

          <p className="mt-3 text-center">
            {staging ? (
              <span className="eyebrow">Making a studio shot…</span>
            ) : studio ? (
              <span className="eyebrow">{useStudio ? "Studio, generated" : "Your photo"}</span>
            ) : (
              <span className="eyebrow">Your photo</span>
            )}
          </p>

          {studio && !staging && (
            <p className="mx-auto mt-3 max-w-sm text-center text-[0.8125rem] leading-relaxed text-muted">
              Generated from your photo, so it keeps the real label — but it is a
              rendering. Check the label still reads right.
            </p>
          )}

          {studioTrouble && (
            <p className="mx-auto mt-3 max-w-sm bg-tint px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-soft">
              {studioTrouble} Your own photo will be used.
            </p>
          )}

          <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => photo && makeStudioShot(photo)}
              disabled={staging}
              className="link-quiet disabled:opacity-50"
            >
              {staging ? "Working…" : studio || studioTrouble ? "Try again" : "Make a studio shot"}
            </button>

            {studio && (
              <button type="button" onClick={() => setUseStudio(!useStudio)} className="link-quiet">
                {useStudio ? "Use my photo" : "Use the studio shot"}
              </button>
            )}

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
                setStudio(null);
                setStudioTrouble(null);
              }}
              className="link-quiet"
            >
              Remove
            </button>
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

      {stage === "form" && <WineForm mode="create" reading={reading} photoDataUrl={chosen} />}

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
