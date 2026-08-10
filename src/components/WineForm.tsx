"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-7">
      <h2 className="eyebrow mb-4">{title}</h2>
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

  const [showDetails, setShowDetails] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleTag(id: string) {
    setTags((current) =>
      current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give it a name — whatever's on the front of the bottle will do.");
      return;
    }
    if (score === null) {
      setError("Say how much you liked it.");
      return;
    }

    setSaving(true);
    try {
      let photoId = wine?.photo_id ?? null;

      if (photoDataUrl) {
        const upload = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: photoDataUrl }),
        });
        if (upload.ok) {
          photoId = ((await upload.json()) as { id: string }).id;
        }
        // A failed photo upload shouldn't lose the tasting note — save anyway.
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
      router.replace(`/wine/${saved.wine.id}`);
      router.refresh();
    } catch {
      setError("Network error — nothing was saved.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-5">
        <div>
          <label className="eyebrow mb-1 block" htmlFor="name">
            Wine
          </label>
          <input
            id="name"
            className="field essay text-[1.375rem]"
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

      <Section title="How was it?">
        <div className="grid grid-cols-2 gap-2">
          {RATINGS.map((rating) => {
            const chosen = score === rating.score;
            return (
              <button
                key={rating.id}
                type="button"
                onClick={() => setScore(rating.score)}
                className={`border px-3 py-3.5 text-[0.9375rem]
                  transition active:scale-[0.98] ${
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

      {error && <p className="text-[0.9375rem] text-wine">{error}</p>}

      <div className="sticky bottom-0 -mx-5 border-t border-rule bg-paper/95 px-5 py-4
        pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button type="submit" className="btn-ink w-full" disabled={saving}>
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add to the log"}
        </button>
      </div>
    </form>
  );
}
