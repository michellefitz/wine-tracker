"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LabelPhoto from "@/components/LabelPhoto";
import { fileToCompressedDataUrl } from "@/lib/image";
import { countryFlag, placeLine } from "@/lib/places";
import { RATINGS, SOURCES, TAG_GROUPS, WINE_TYPES, tagsInGroup } from "@/lib/taxonomy";
import type { LabelReading, Wine } from "@/lib/types";

type Props = {
  mode: "create" | "edit";
  wine?: Wine;
  /**
   * What the label reader came back with.
   *
   * Arrives late: the add flow puts this form on screen the moment there's a
   * photo and hands the reading over when it lands, so the fields fill in
   * while you're looking at them rather than before you get here.
   */
  reading?: LabelReading | null;
  /** A freshly captured photo that still needs uploading. */
  photoDataUrl?: string | null;
  /**
   * What the web already said about this bottle, looked up while you were
   * still writing about it. Saved alongside the wine so its own page doesn't
   * start the same search over the moment it opens.
   */
  found?: { facts: unknown; serving: unknown } | null;
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

/**
 * One line of the details table: a label on the left, the value on the right.
 *
 * The same shape the bottle's own page uses, so the table reads identically
 * whether the value is being shown or typed. See .field-cell for the input
 * that has to disappear into it.
 */
function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="eyebrow shrink-0">{term}</dt>
      <dd className="min-w-0 flex-1 text-right">{children}</dd>
    </div>
  );
}

/**
 * A select in the details table, with a chevron so it reads as one.
 *
 * A bare select in this table is indistinguishable from the rows either side
 * of it — right-aligned text on a transparent ground — so there's nothing to
 * say it can be opened. The arrow is drawn rather than left to the browser,
 * whose own is a grey lozenge on iOS that would be the loudest thing on the
 * page.
 */
function Choose({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <select id={id} className="field-cell w-auto" value={value} onChange={onChange}>
        {children}
      </select>
      <svg
        width="11"
        height="11"
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="shrink-0 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </span>
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
    /*
     * Separated by space, not by a line. Every section used to open with a
     * hairline and the form came out as a stack of boxes — six rules down one
     * screen stops reading as structure and starts reading as ruling.
     */
    <section className="pt-10">
      <h2 className={`eyebrow mb-4 ${missing ? "text-wine" : ""}`}>
        {title}
        {required && <Required />}
      </h2>
      {children}
    </section>
  );
}

export default function WineForm({ mode, wine, reading, photoDataUrl, found }: Props) {
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

  /*
   * The reading landing on a form that's already up.
   *
   * It used to arrive as an initial value, because the flow above held the
   * form back until the reader answered. Now it can turn up at any point,
   * including a few keystrokes into a field — so anything you've touched wins,
   * and only what's still empty takes what came back. Once, and only once: a
   * re-read would otherwise overwrite a correction with the same wrong guess.
   *
   * `keep` is deliberately "use what's there if there's anything there", not
   * "take the reading if the reading has a value" — so a blank answer from the
   * reader can't wipe something you typed while it was thinking.
   */
  const filled = useRef(false);
  useEffect(() => {
    if (!reading || filled.current) return;
    filled.current = true;

    const keep = (current: string, value: string) => (current.trim() ? current : value);

    setName((current) => keep(current, reading.name ?? ""));
    setProducer((current) => keep(current, reading.producer ?? ""));
    setVintage((current) => keep(current, reading.vintage ? String(reading.vintage) : ""));
    setWineType((current) => keep(current, reading.wine_type ?? ""));
    setRegion((current) => keep(current, reading.region ?? ""));
    setCountry((current) => keep(current, reading.country ?? ""));
    setGrapes((current) => keep(current, (reading.grapes ?? []).join(", ")));

    /*
     * Region, country and grapes live behind "Where, when, how much", which is
     * shut by default. If the label had any of them, open it — the point of
     * the whole screen is watching the bottle fill itself in, and three of the
     * fields doing it out of sight is three quarters of the trick wasted.
     */
    if (reading.region || reading.country || (reading.grapes ?? []).length) {
      setShowDetails(true);
    }
  }, [reading]);

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
        /*
         * Carried, not looked up again. The add screen searched the web while
         * this form was being filled in; handing the answer over with the wine
         * is what stops its page searching for the same bottle a second time
         * and rewriting the serving note you already read.
         */
        ...(mode === "create" && found
          ? { facts: found.facts, serving: found.serving }
          : {}),
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

  /* The place line under the name, from whatever the fields hold right now. */
  const place = placeLine(region.trim() || null, country.trim() || null);
  const flag = countryFlag(country.trim() || null);

  const missingName = !name.trim();
  const missingScore = score === null;
  /*
   * One complaint at a time, in the order you'd meet them coming down the page.
   * Two red lines at once is a form telling you off; one is a form telling you
   * what to do next.
   */
  /*
   * What's still missing, said all the time rather than only after you've
   * pressed a button that then didn't work. It's two fields; there's no
   * suspense to preserve, and "only the name and the rating are needed" was
   * answering a question nobody had asked while staying silent about the one
   * they had.
   */
  const missing =
    missingName && missingScore
      ? "Add a name and a rating to save."
      : missingName
        ? "Add a name to save."
        : missingScore
          ? "Add a rating to save."
          : null;
  const notice = error ?? (attempted ? missing : null);

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
            <div className="relative aspect-4/5 w-44 shrink-0 overflow-hidden bg-tint">
              <div
                className={`h-full w-full transition-opacity duration-500 ${
                  staging ? "opacity-55" : "opacity-100"
                }`}
              >
                {photo}
              </div>
              {staging && (
                <span aria-hidden className="studio-sweep pointer-events-none absolute inset-0" />
              )}
            </div>

            <div className="flex flex-col items-start gap-2.5 pb-1">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="link-plain"
              >
                {storedPhoto || newPhoto ? "Change photo" : "Add a photo"}
              </button>

              {(storedPhoto || newPhoto) && (
                <button
                  type="button"
                  onClick={makeStudioShot}
                  disabled={busyWithPhoto}
                  className="link-plain disabled:opacity-50"
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
                  className="link-plain"
                >
                  Remove
                </button>
              )}

              {newPhoto && (
                <span className="text-[0.8125rem] text-muted">New — saves with the rest</span>
              )}
            </div>
          </div>

          {photoNotice && (
            <p className="mt-4 bg-tint px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              {photoNotice}
            </p>
          )}
        </section>
      )}

      {/*
        The wall label, the same one the bottle's own page shows — producer,
        wine, place, verdict — except that here you can type into it.
        
        Logging, reading and editing were three different-looking screens for
        one bottle, and the differences were arbitrary: the same facts sat in a
        table on one, in labelled fields on another, in a different order on
        the third. They are one layout now. The fields keep no borders and no
        labels of their own, because a caption over a wine's name is a form
        asking a question you have already answered.
      */}
      <header className="text-center">
        <input
          id="producer"
          aria-label="Producer"
          className="w-full border-0 bg-transparent p-0 text-center eyebrow outline-none
            placeholder:text-muted/60"
          value={producer}
          onChange={(event) => setProducer(event.target.value)}
          placeholder="Producer"
        />
        <input
          id="name"
          ref={nameField}
          aria-label="Wine"
          aria-invalid={attempted && missingName}
          className={`mt-2 w-full border-0 bg-transparent p-0 text-center essay
            text-[1.75rem] leading-[1.2] outline-none placeholder:text-muted/50 ${
              attempted && missingName ? "text-wine" : "text-ink"
            }`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="What is it?"
        />
        {place && (
          <p className="mt-2 flex items-baseline justify-center gap-2 text-[0.9375rem] text-ink-soft">
            {flag && (
              <span aria-hidden="true" className="text-[1.0625rem] leading-none">
                {flag}
              </span>
            )}
            <span>{place}</span>
          </p>
        )}
      </header>

      {/*
        Your verdict, first. It's the one thing on this screen that only you
        can supply — everything under it was read off the label or found on the
        web — so it goes where the eye lands rather than four sections down.
      */}
      <section>
        <h2
          className={`eyebrow mb-3 text-center ${
            attempted && missingScore ? "text-wine" : ""
          }`}
        >
          How was it?
          <Required />
        </h2>
        <div ref={scoreGroup} className="flex flex-wrap justify-center gap-2">
          {RATINGS.map((rating) => {
            const chosen = score === rating.score;
            return (
              <button
                key={rating.id}
                type="button"
                onClick={() => setScore(rating.score)}
                className={`rounded-full border px-4 py-2.5 text-[0.9375rem]
                  transition-[transform,border-color] duration-[160ms] ease-out-strong
                  active:scale-95 ${
                    chosen
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-soft pointer-hover:hover:border-muted"
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
      </section>

      {/*
        The same table the bottle's page shows, with the values typed into
        rather than read off. It stopped being behind a "where, when, how much"
        disclosure: nothing in it is advanced, half of it arrives filled in
        from the label, and a fold you have to open to check the vintage is a
        fold that gets opened every time.
      */}
      <dl className="mx-auto max-w-md divide-y divide-rule border-y border-rule">
        <Row term="Vintage">
          <input
            id="vintage"
            className="field-cell"
            inputMode="numeric"
            value={vintage}
            onChange={(event) => setVintage(event.target.value)}
            placeholder="—"
          />
        </Row>
        <Row term="Type">
          <Choose
            id="wine-type"
            value={wineType}
            onChange={(event) => setWineType(event.target.value)}
          >
            <option value="">Select</option>
            {WINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Choose>
        </Row>
        <Row term="Grapes">
          <input
            id="grapes"
            className="field-cell"
            value={grapes}
            onChange={(event) => setGrapes(event.target.value)}
            placeholder="—"
          />
        </Row>
        <Row term="Region">
          <input
            id="region"
            className="field-cell"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="—"
          />
        </Row>
        <Row term="Country">
          <input
            id="country"
            className="field-cell"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="—"
          />
        </Row>
        <Row term="Bought at">
          <Choose
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Select</option>
            {SOURCES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Choose>
        </Row>
        <Row term="Price">
          {/* The symbol sits outside the field so it doesn't have to be typed,
              deleted or validated — and the placeholder shows the shape of an
              answer rather than a dash standing in for one. */}
          <span className="inline-flex items-baseline justify-end gap-0.5">
            <span className={price ? "text-ink" : "text-muted/60"}>€</span>
            <input
              id="price"
              className="field-cell w-16"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="20"
            />
          </span>
        </Row>
        <Row term={score === 0 ? "Added" : "Drank"}>
          {/* w-auto so it shrinks to the date and the <dd>'s text-right can
              push it over: a date input ignores text-align, because the box it
              aligns is the picker's, not the text's. */}
          <input
            id="drank-on"
            type="date"
            className="field-cell ml-auto w-auto"
            value={drankOn}
            onChange={(event) => setDrankOn(event.target.value)}
          />
        </Row>
      </dl>

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

      {/*
        Set as the quotation it is. This is the only thing on the page you
        wrote, and it was sitting in a grey box looking like every other input
        — the marks and the italic say it is a voice rather than a field.
      */}
      <Section title="Your note">
        <div className="relative mx-auto max-w-md">
          <span aria-hidden className="absolute -left-1 -top-2 essay text-[2rem] leading-none text-rule">
            &ldquo;
          </span>
          <textarea
            id="notes"
            className="min-h-24 w-full resize-y border-0 bg-transparent px-5 py-1 text-center
              essay text-[1.25rem] italic leading-[1.45] text-ink outline-none
              placeholder:not-italic placeholder:text-muted/70"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What did you make of it?"
          />
          <span aria-hidden className="absolute -bottom-4 -right-1 essay text-[2rem] leading-none text-rule">
            &rdquo;
          </span>
        </div>
      </Section>

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
              <Link href={`/wine/${photoTrouble.wineId}`} className="link-plain">
                Open the bottle
              </Link>
              <Link href={`/wine/${photoTrouble.wineId}/edit`} className="link-plain">
                Try the photo again
              </Link>
            </p>
          )}
        </div>
      )}

      {/*
        Fixed, not sticky.
        
        Sticky holds a thing to the bottom of the screen only while its own
        container is on screen — so the save button vanished the moment you
        scrolled past the end of the form and into the serving note and the
        write-up, which is exactly where you are when you finish reading and
        decide to keep the bottle. It is pinned to the window now and stays
        there the whole way down. The page carries bottom padding to match, so
        nothing ends up underneath it.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 px-5 py-4
        pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto w-full max-w-xl">
          {(notice ?? missing) && (
            <p
              role={notice ? "alert" : undefined}
              className={`mb-3 text-center text-[0.875rem] leading-snug ${
                notice ? "text-wine" : "text-muted"
              }`}
            >
              {notice ?? missing}
            </p>
          )}
          <button type="submit" className="btn-ink w-full" disabled={saving}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add to the log"}
          </button>
        </div>
      </div>
    </form>
  );
}
