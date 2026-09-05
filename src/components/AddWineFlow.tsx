"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PouringGlass, ReadingLabel } from "@/components/Loaders";
import ServingGuide from "@/components/ServingGuide";
import WineFactsView from "@/components/WineFactsView";
import WineForm from "@/components/WineForm";
import { fileToCompressedDataUrl } from "@/lib/image";
import { asServingNote, type ServingNote } from "@/lib/serving-note";
import { servingFor } from "@/lib/serving";
import type { LabelReading } from "@/lib/types";
import type { StoredFacts } from "@/lib/wine-facts";

/**
 * Logging a bottle, from the photo down.
 *
 * The shape of this screen is one idea: after the shutter you don't answer
 * questions, you watch. The picture is up the moment you choose it, and two
 * jobs start on it at once — the studio shot being made, and the label being
 * read. Neither waits for the other, and neither holds up the form: it's on
 * screen straight away, empty, and fills in underneath you as the reader
 * comes back. Everything on this page is a thing you can correct afterwards,
 * so nothing here is a question you have to answer first.
 *
 * The form used to be held back until the reading landed, which meant staring
 * at a drawing of a label and then being handed a form that was already
 * complete. Nothing was ever seen happening.
 */
export default function AddWineFlow() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [readingLabel, setReadingLabel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /*
   * What the web says about the bottle, found here rather than on the page
   * that opens afterwards.
   *
   * Logging a wine used to be two waits with a save wedged between them: the
   * label reading, then the form, then a web search starting from scratch the
   * moment the bottle's own page opened — which also rewrote the serving note
   * you'd just been reading. The search now runs the moment the label has been
   * read, while you're still deciding what you thought of it, and what it
   * finds goes to the server with the wine.
   */
  const [found, setFound] = useState<{ facts: unknown; serving: unknown } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchTrouble, setSearchTrouble] = useState<string | null>(null);

  /*
   * The studio shot runs on its own as soon as there's a photo, because it
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

  /**
   * Everything the web knows, started as soon as there's a name to search for.
   *
   * Never blocks anything: it can be slow, it can fail, and either way the
   * bottle still saves. A failure here costs the wine's page one search on
   * first view, which is what it always used to do.
   */
  async function lookUp(label: LabelReading) {
    setSearching(true);
    setSearchTrouble(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producer: label.producer,
          name: label.name,
          vintage: label.vintage,
          region: label.region,
          country: label.country,
          grapes: label.grapes,
          wine_type: label.wine_type,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        facts?: unknown;
        serving?: unknown;
        reason?: string;
        error?: string;
      };
      if (payload.facts || payload.serving) {
        setFound({ facts: payload.facts ?? null, serving: payload.serving ?? null });
      }
      if (!payload.facts) {
        setSearchTrouble(payload.reason ?? payload.error ?? "Nothing came back about this one.");
      }
    } catch {
      setSearchTrouble("Couldn't reach the server to look this bottle up.");
    }
    setSearching(false);
  }

  async function readLabel(dataUrl: string) {
    setReadingLabel(true);
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
          // Straight on to the web, without waiting to be asked.
          if (result.name) void lookUp(result);
        } else {
          setNotice(result.note ?? "That didn't look like a wine label. Fill it in by hand.");
        }
      }
    } catch {
      setNotice("Couldn't reach the label reader. Fill it in by hand.");
    }
    setReadingLabel(false);
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
    setStarted(true);

    // Both at once: neither needs the other, so the wait is the length of the
    // slower one rather than the sum of the two.
    void makeStudioShot(dataUrl);
    void readLabel(dataUrl);
  }

  const chosen = studio && useStudio ? studio : photo;
  const showingStudio = Boolean(studio && useStudio);
  /*
   * How to serve it, ready before you've decided whether you like it.
   *
   * The rules answer for any bottle instantly; the note written for this one
   * arrives with the search and wins when it does. Same pair, same precedence
   * and same component as the bottle's own page — the point of the whole
   * exercise is that the two screens stop disagreeing.
   */
  const byRule = servingFor({
    wineType: reading?.wine_type ?? null,
    grapes: reading?.grapes ?? [],
    label: [reading?.producer, reading?.name, reading?.region].filter(Boolean).join(" "),
  });
  const written = asServingNote(found?.serving);
  const serving = byRule && written ? { ...byRule, ...strip(written) } : byRule;

  /** The bottle as read, so a reviewer's own site can be searched for it. */
  const query = [reading?.producer, reading?.name, reading?.vintage]
    .filter(Boolean)
    .join(" ");

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
            Both pictures, stacked, with the studio shot fading in over your
            own when it lands. A swap would just blink; a cross-fade is the one
            moment on this screen where you can actually see the thing that was
            being made arrive.
          */}
          <div className="relative mx-auto aspect-4/5 w-full max-w-[16rem] overflow-hidden bg-tint">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="The label for this bottle"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity
                duration-500 ${staging ? "opacity-55" : "opacity-100"}`}
            />

            {studio && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={studio}
                alt="The same bottle, restaged"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity
                  duration-700 ease-out-strong ${showingStudio ? "opacity-100" : "opacity-0"}`}
              />
            )}

            {staging && (
              <span aria-hidden className="studio-sweep pointer-events-none absolute inset-0" />
            )}
          </div>

          {staging && (
            <p className="mt-3 text-center text-[0.875rem] text-muted" aria-live="polite">
              Setting up the studio shot…
            </p>
          )}

          {studioTrouble && (
            <p className="mx-auto mt-3 max-w-sm bg-tint px-4 py-3 text-center text-[0.8125rem]
              leading-relaxed text-ink-soft">
              {studioTrouble} Your own photo will be used.
            </p>
          )}

          {/*
            One control, not four.
            
            The row of buttons under the photograph was a menu for a decision
            nobody makes twice: the studio shot is right nearly every time, so
            the options belong behind a tap rather than in front of one. Open
            it and they're all still there.
          */}
          <div className="mt-3 flex justify-center">
            <details className="group relative">
              <summary
                aria-label="Photo options"
                className="mx-auto flex size-9 cursor-pointer list-none items-center
                  justify-center rounded-full border border-rule text-ink-soft
                  transition-colors pointer-hover:hover:border-muted"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="10" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
                  <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
                  <circle cx="10" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </summary>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {!staging && (
                  <button
                    type="button"
                    onClick={() => photo && makeStudioShot(photo)}
                    className="btn-quiet"
                  >
                    {studio || studioTrouble ? "Try the studio shot again" : "Make a studio shot"}
                  </button>
                )}
                {studio && !staging && (
                  <button
                    type="button"
                    onClick={() => setUseStudio(!useStudio)}
                    className="btn-quiet"
                  >
                    {useStudio ? "Use my photo" : "Use the studio shot"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="btn-quiet"
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
                  className="btn-quiet"
                >
                  Remove
                </button>
              </div>
            </details>
          </div>
        </div>
      )}

      {!started && (
        <div className="pt-8 text-center">
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
              className="link-plain"
              onClick={() => setStarted(true)}
            >
              Skip — I&apos;ll type it in
            </button>
          </p>
        </div>
      )}

      {/*
        One slot between the picture and the form, and it never empties once
        there's a photo in play: the drawing while the label is being read,
        then a line saying what came of it. Letting it disappear altogether
        dropped a hundred and thirty pixels out of the page at the exact
        moment the fields underneath were filling in, which is the one moment
        on this screen you're meant to be watching.
      */}
      {photo && (
        <div className="pt-2">
          {readingLabel ? (
            <ReadingLabel caption="Reading the label…" />
          ) : notice ? (
            <p className="bg-tint px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              {notice}
            </p>
          ) : null}
        </div>
      )}

      {notice && !photo && (
        <p className="bg-tint px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          {notice}
        </p>
      )}

      {started && (
        <WineForm mode="create" reading={reading} photoDataUrl={chosen} found={found} />
      )}

      {/*
        What the world says, under what you made of it.
        
        The order is the argument: your verdict is the thing only you can
        supply, so it goes first, and the write-up, the ratings and how to
        serve it sit under it as context rather than as a preamble to be
        scrolled past. It is all found during the add, so none of it is a wait
        that starts when you save.
      */}
      {started && (searching || found) && (
        <div className="pt-4">
          {serving && <ServingGuide serving={serving} variant="section" />}

          <h2 className="eyebrow mb-3 mt-9">About this bottle</h2>
          {searching && !found ? (
            <PouringGlass caption="Looking it up…" />
          ) : found?.facts ? (
            <WineFactsView facts={found.facts as StoredFacts} query={query} />
          ) : (
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              {searchTrouble ?? "Nothing much is written about this one."}
            </p>
          )}
        </div>
      )}

      {!started && (
        <p className="text-center">
          <Link href="/" className="link-plain">
            Back to the log
          </Link>
        </p>
      )}
    </div>
  );
}

/** The note's lines, without the version stamp the heading has no use for. */
function strip(note: ServingNote): Omit<ServingNote, "version"> {
  const { version, ...lines } = note;
  void version;
  return lines;
}
