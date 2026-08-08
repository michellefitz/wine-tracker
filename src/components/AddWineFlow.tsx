"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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

      {photo && (
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
              }}
              className="link-quiet"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {stage === "capture" && (
        <div className="border-t border-rule pt-10 text-center">
          <p className="mx-auto max-w-xs font-display text-[1.75rem] leading-snug text-ink">
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

      {stage === "form" && <WineForm mode="create" reading={reading} photoDataUrl={photo} />}

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
