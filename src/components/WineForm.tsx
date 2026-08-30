"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import LabelPhoto from "@/components/LabelPhoto";
import { fileToCompressedDataUrl } from "@/lib/image";
import { RATINGS, SOURCES, TAG_GROUPS, WINE_TYPES, tagsInGroup } from "@/lib/taxonomy";
import type { LabelReading, Wine } from "@/lib/types";

type Props = {
  mode: "create" | "edit";
  wine?: Wine;
  /** What the label reader came back with, used to prefill a new entry. */
  reading?: LabelReading | null;
  /** A freshly captured photo that still needs uploading. */
  photoDataUrl?: string | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The mark on a field you can't save without.
 *
 * Two of the twelve things on this form are needed and ten aren't, so the
 * marks go on the two — marking the optional ones would put a note beside
 * nearly every label. An asterisk because it's the one convention everybody
 * already reads without being told, in the accent colour because that's the
 * thing the eye finds first on a page that is otherwise ink on paper.
 */
function Required() {
  return (
    <>
      <span aria-hidden className="ml-1 text-wine">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function Section({
  title,
  required,
  missing,
  children,
}: {
  title: string;
  required?: boolean;
  /** Asked for, still empty — the heading says so rather than only the footer. */
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-7">
      <h2 className={`eyebrow mb-4 ${missing ? "text-wine" : ""}`}>
        {title}
        {required && <Required />}
      </h2>
      {children}
    </section>
  );
}

export default function WineForm({ mode, wine, reading, photoDataUrl }: Props) {
  const router = useRouter();

  const [name, setName] = useState(wine?.name ?? reading?.name ?? "");
  const [producer, setProducer] = useState(wine?.producer ?? reading?.producer ?? "");
  const [vintage, setVintage] = useState(String(wine?.vintage ?? reading?.vintage ?? ""));
  const [wineType, setWineType] = useState(wine?.wine_type ?? reading?.wine_type ?? "");
  const [region, setRegion] = useState(wine?.region ?? reading?.region ?? "");
  const [country, setCountry] = useState(wine?.country ?? reading?.country ?? "");
  const [grapes, setGrapes] = useState((wine?.grapes ?? reading?.grapes ?? []).join(", "));

  const [score, setScore] = useState<number | null>(wine?.score ?? null);
  const [tags, setTags] = useState<string[]>(wine?.tags ?? []);
  const [notes, setNotes] = useState(wine?.notes ?? "");
  const [price, setPrice] = useState(
    wine?.price_eur !== null && wine?.price_eur !== undefined ? String(wine.price_eur) : "",
  );
  const [source, setSource] = useState(wine?.source ?? "");
  const [drankOn, setDrankOn] = useState(wine?.drank_on ?? today());

  /*
   * The picture, on a bottle that already has one.
   *
   * Two values rather than one, because "the photo I want to end up with" and
   * "the photo that's currently stored" only differ until you save. Keeping the
   * stored id means a failed upload falls back to the label you already had
   * instead of quietly leaving the bottle bare.
   *
   * Adding a wine doesn't come through here — that flow owns its own picker,
   * because it runs the studio shot the moment a photo arrives and has to show
   * you both while it's still deciding which one you'll keep.
   */
  const [storedPhoto, setStoredPhoto] = useState(wine?.photo_id ?? null);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [showDetails, setShowDetails] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  /*
   * Set the first time Save is pressed, and never unset.
   *
   * Nothing about "required" shows before then — a form that goes red at you
   * for not having filled in the field you're about to fill in is nagging. But
   * once you've asked to save, the complaint has to stay live: fix the name and
   * the message should move on to the rating by itself, not wait for another
   * press to tell you there was a second thing wrong.
   */
  const [attempted, setAttempted] = useState(false);
  const nameField = useRef<HTMLInputElement>(null);
  const scoreGroup = useRef<HTMLDivElement>(null);
  /** Set when the bottle saved but its photo didn't — see the notice below. */
  const [photoTrouble, setPhotoTrouble] = useState<{ message: string; wineId?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onPhotoChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a change
    if (!file) return;

    setPhotoNotice(null);
    try {
      setNewPhoto(await fileToCompressedDataUrl(file));
    } catch (error) {
      setPhotoNotice(error instanceof Error ? error.message : "Couldn't read that photo.");
    }
  }

  /**
   * Restage the bottle under studio lighting, starting from your own photo.
   *
   * A generated picture, and offered as one. It keeps the label because it
   * starts from the photograph rather than from the wine's name — but it is
   * still a rendering, small print on the label may not survive it, and it
   * costs a generation every time it's pressed. All three are reasons it only
   * happens when you ask.
   */
  async function makeStudioShot() {
    setStaging(true);
    setPhotoNotice(null);
    try {
      const response = await fetch("/api/photos/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPhoto ? { dataUrl: newPhoto } : { photoId: storedPhoto }),
      });
      const payload = (await response.json()) as {
        generated?: boolean;
        dataUrl?: string;
        reason?: string;
        error?: string;
      };
      if (payload.generated && payload.dataUrl) {
        setNewPhoto(payload.dataUrl);
        setPhotoNotice(
          "This is a generated picture, made from your photo. Check the label still reads right before you save it.",
        );
      } else {
        setPhotoNotice(payload.reason ?? payload.error ?? "That photo couldn't be restaged.");
      }
    } catch {
      setPhotoNotice("Couldn't reach the server to make a studio shot.");
    }
    setStaging(false);
  }

  function toggleTag(id: string) {
    setTags((current) =>
      current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAttempted(true);

    /*
     * Say it where the button is, and go to the field.
     *
     * The message used to be rendered in the flow of the form, which on a phone
     * put it about eight hundred pixels below the fold — under a Save button
     * that sticks to the bottom of the screen. Pressing Save with an empty name
     * changed nothing you could see, which reads exactly like a button that
     * doesn't work. The complaint now sits in the sticky bar, and the form
     * scrolls to whatever it's complaining about.
     */
    if (missingName) {
      nameField.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameField.current?.focus({ preventScroll: true });
      return;
    }
    if (missingScore) {
      scoreGroup.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      // Editing tracks its own; adding is handed one by the flow around it.
      let photoId = mode === "edit" ? storedPhoto : (wine?.photo_id ?? null);
      let photoFailed: string | null = null;

      const pendingPhoto = mode === "edit" ? newPhoto : photoDataUrl;

      if (pendingPhoto) {
        const upload = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: pendingPhoto }),
        });

        if (upload.ok) {
          photoId = ((await upload.json()) as { id: string }).id;
        } else {
          /*
           * A failed photo upload shouldn't lose the tasting note, so the save
           * still goes ahead — but it used to go ahead in silence, and a bottle
           * that quietly arrives without its label looks like the app lost the
           * picture. Say what happened and let the note through.
           */
          const payload = (await upload.json().catch(() => ({}))) as { error?: string };
          console.error("wine-form: photo upload failed:", upload.status, payload.error);
          photoFailed = payload.error
            ? `The photo didn't upload: ${payload.error.toLowerCase()}.`
            : "The photo didn't upload.";
        }
      }

      const body = {
        producer: producer.trim() || null,
        name: name.trim(),
        vintage: vintage.trim() || null,
        region: region.trim() || null,
        country: country.trim() || null,
        grapes: grapes
          .split(",")
          .map((grape) => grape.trim())
          .filter(Boolean),
        wine_type: wineType || null,
        score,
        tags,
        notes: notes.trim() || null,
        price_eur: price.trim() || null,
        source: source || null,
        photo_id: photoId,
        drank_on: drankOn || null,
      };

      const response = await fetch(
        mode === "edit" ? `/api/wines/${wine!.id}` : "/api/wines",
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Couldn't save that.");
        setSaving(false);
        return;
      }

      const saved = (await response.json()) as { wine: Wine };

      // Everything but the picture. Navigating now would take the notice with
      // it and the bottle would just quietly turn up without its label.
      if (photoFailed) {
        setPhotoTrouble({ message: photoFailed, wineId: saved.wine.id });
        setSaving(false);
        router.refresh();
        return;
      }

      router.replace(`/wine/${saved.wine.id}`);
      router.refresh();
    } catch {
      setError("Network error — nothing was saved.");
      setSaving(false);
    }
  }

  const busyWithPhoto = staging;

  const missingName = !name.trim();
  const missingScore = score === null;
  /*
   * One complaint at a time, in the order you'd meet them coming down the page.
   * Two red lines at once is a form telling you off; one is a form telling you
   * what to do next.
   */
  const complaint = !attempted
    ? null
    : missingName
      ? "This one still needs a name — whatever's on the front of the bottle will do."
      : missingScore
        ? "Nearly. Say how much you liked it and it'll save."
        : null;
  const notice = error ?? complaint;

  const photo = newPhoto ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={newPhoto} alt="The photo you just chose" className="h-full w-full object-cover" />
  ) : (
    <LabelPhoto
      photoId={storedPhoto}
      alt={`Label of ${wine?.name ?? "this bottle"}`}
      width={560}
      className="h-full w-full object-cover"
    />
  );

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/*
        Changing the picture on a bottle you already logged — a different
        photo, or another go at the studio shot. The studio shot is a
        rendering, and one you accepted once is not one you're stuck with: the
        same photo doesn't produce the same result twice, so a bad roll is
        usually only bad once.

        No `capture` attribute, same as the add flow: it would force the camera
        open, and the photo you want is usually already in the camera roll.
        Without it the phone puts up its own chooser — library, camera, files —
        which is a better menu than anything drawn here.
      */}
      {mode === "edit" && (
        <section>
          <p className="eyebrow mb-4">Photo</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoChosen}
          />

          <div className="flex items-end gap-6">
            <div className="aspect-4/5 w-44 shrink-0 overflow-hidden bg-tint">{photo}</div>

            <div className="flex flex-col items-start gap-2.5 pb-1">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="link-quiet"
              >
                {storedPhoto || newPhoto ? "Change photo" : "Add a photo"}
              </button>

              {(storedPhoto || newPhoto) && (
                <button
                  type="button"
                  onClick={makeStudioShot}
                  disabled={busyWithPhoto}
                  className="link-quiet disabled:opacity-50"
                >
                  {staging ? "Restaging…" : newPhoto ? "Try again" : "Make a studio shot"}
                </button>
              )}

              {(storedPhoto || newPhoto) && (
                <button
                  type="button"
                  onClick={() => {
                    setStoredPhoto(null);
                    setNewPhoto(null);
                    setPhotoNotice(null);
                  }}
                  className="link-quiet"
                >
                  Remove
                </button>
              )}

              {newPhoto && <span className="eyebrow">New — saves with the rest</span>}
            </div>
          </div>

          {photoNotice && (
            <p className="mt-4 bg-tint px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              {photoNotice}
            </p>
          )}
        </section>
      )}

      <section className="space-y-5">
        <div>
          <label
            className={`eyebrow mb-1 block ${attempted && missingName ? "text-wine" : ""}`}
            htmlFor="name"
          >
            Wine
            <Required />
          </label>
          <input
            id="name"
            ref={nameField}
            aria-invalid={attempted && missingName}
            className={`field essay text-[1.375rem] ${
              attempted && missingName ? "border-wine" : ""
            }`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Reserva Malbec"
          />
        </div>

        <div>
          <label className="eyebrow mb-1 block" htmlFor="producer">
            Producer
          </label>
          <input
            id="producer"
            className="field"
            value={producer}
            onChange={(event) => setProducer(event.target.value)}
            placeholder="Bodega Norton"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="eyebrow mb-1 block" htmlFor="vintage">
              Vintage
            </label>
            <input
              id="vintage"
              className="field"
              inputMode="numeric"
              value={vintage}
              onChange={(event) => setVintage(event.target.value)}
              placeholder="2021"
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block" htmlFor="wine-type">
              Type
            </label>
            <select
              id="wine-type"
              className="field"
              value={wineType}
              onChange={(event) => setWineType(event.target.value)}
            >
              <option value="">—</option>
              {WINE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <Section title="How was it?" required missing={attempted && missingScore}>
        <div ref={scoreGroup} className="grid grid-cols-2 gap-2">
          {RATINGS.map((rating) => {
            const chosen = score === rating.score;
            return (
              <button
                key={rating.id}
                type="button"
                onClick={() => setScore(rating.score)}
                className={`border px-3 py-3.5 text-[0.9375rem] transition-transform
                  duration-[160ms] ease-out-strong active:scale-[0.98] ${
                    chosen
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-soft hover:border-muted"
                  }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span
                    aria-hidden
                    className={`inline-block size-2 rounded-full border ${
                      chosen
                        ? "border-paper " + (rating.solid ? "bg-paper" : "bg-transparent")
                        : (rating.liked ? "border-wine " : "border-muted ") +
                          (rating.solid ? (rating.liked ? "bg-wine" : "bg-muted") : "bg-transparent")
                    }`}
                  />
                  {rating.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="What stood out?">
        <div className="space-y-5">
          {TAG_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[0.8125rem] text-muted">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {tagsInGroup(group).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`chip ${tags.includes(tag.id) ? "chip-on" : ""}`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Notes">
        {/* Boxed rather than underlined, so it doesn't double up with the
            next section's rule. */}
        <textarea
          id="notes"
          className="field-boxed min-h-28 resize-y essay text-[1.125rem] leading-relaxed"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything you want to remember about it."
        />
      </Section>

      <section className="border-t border-rule pt-7">
        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          className="link-quiet"
        >
          {showDetails ? "Hide extra details" : "Where, when, how much"}
        </button>

        {showDetails && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="eyebrow mb-1 block" htmlFor="source">
                  Bought at
                </label>
                <select
                  id="source"
                  className="field"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                >
                  <option value="">—</option>
                  {SOURCES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1 block" htmlFor="price">
                  Price (€)
                </label>
                <input
                  id="price"
                  className="field"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="12.99"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="eyebrow mb-1 block" htmlFor="region">
                  Region
                </label>
                <input
                  id="region"
                  className="field"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="Mendoza"
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block" htmlFor="country">
                  Country
                </label>
                <input
                  id="country"
                  className="field"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Argentina"
                />
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1 block" htmlFor="grapes">
                Grapes
              </label>
              <input
                id="grapes"
                className="field"
                value={grapes}
                onChange={(event) => setGrapes(event.target.value)}
                placeholder="Malbec, Cabernet Sauvignon"
              />
            </div>

            <div>
              <label className="eyebrow mb-1 block" htmlFor="drank-on">
                Date
              </label>
              <input
                id="drank-on"
                type="date"
                className="field"
                value={drankOn}
                onChange={(event) => setDrankOn(event.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/*
        Saved, minus the photo. This stays put rather than navigating on, so the
        one thing that went wrong is read before the bottle is opened.
      */}
      {photoTrouble && (
        <div className="border border-rule bg-card p-5">
          <p className="text-[0.9375rem] leading-relaxed text-ink">
            {photoTrouble.message} Everything else was saved.
          </p>
          {photoTrouble.wineId && (
            <p className="mt-3 flex items-baseline gap-5">
              <Link href={`/wine/${photoTrouble.wineId}`} className="link-quiet">
                Open the bottle
              </Link>
              <Link href={`/wine/${photoTrouble.wineId}/edit`} className="link-quiet">
                Try the photo again
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-rule bg-paper/95 px-5 py-4
        pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        {/* Whatever is standing between you and a saved bottle, said next to
            the button that isn't saving it. */}
        {notice && (
          <p role="alert" className="mb-3 text-[0.9375rem] leading-snug text-wine">
            {notice}
          </p>
        )}
        <button type="submit" className="btn-ink w-full" disabled={saving}>
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add to the log"}
        </button>
        {/* Answers the question the asterisks raise, once, in the place it
            gets asked: what actually has to be filled in? */}
        {!notice && (
          <p className="mt-2.5 text-center text-[0.8125rem] text-muted">
            Only the name and the rating are needed.
          </p>
        )}
      </div>
    </form>
  );
}
