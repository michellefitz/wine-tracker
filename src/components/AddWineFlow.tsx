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
    <div className="space-y-5">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhotoChosen}
      />

      {photo && (
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="The label you photographed"
            className="h-32 w-24 rounded-xl border border-line object-cover"
          />
          <div className="flex flex-col justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="text-sm text-muted underline underline-offset-4"
            >
              Retake photo
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setReading(null);
              }}
              className="text-left text-sm text-muted underline underline-offset-4"
            >
              Remove photo
            </button>
          </div>
        </div>
      )}

      {stage === "capture" && (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-ink">
            Photograph the label
          </p>
          <p className="text-sm text-muted">
            The producer, vintage and region get filled in for you. You can fix anything
            that comes back wrong.
          </p>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => fileInput.current?.click()}
          >
            📷 Take a photo
          </button>
          <button
            type="button"
            className="text-sm text-muted underline underline-offset-4"
            onClick={() => setStage("form")}
          >
            Skip — I&apos;ll type it in
          </button>
        </div>
      )}

      {stage === "reading" && (
        <div className="rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="text-sm text-muted">Reading the label…</p>
        </div>
      )}

      {notice && stage === "form" && (
        <p className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">
          {notice}
        </p>
      )}

      {stage === "form" && (
        <WineForm mode="create" reading={reading} photoDataUrl={photo} />
      )}

      {stage !== "form" && (
        <p className="text-center">
          <Link href="/" className="text-sm text-muted underline underline-offset-4">
            Back to the log
          </Link>
        </p>
      )}
    </div>
  );
}
