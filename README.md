# Cellar Notes

A private log of the wines you've had and what you made of them. Photograph the
label, tap how much you liked it, add a note. Later, in the shop, search it.

Built for one person. There are no accounts, no social feed, and no ratings from
anyone else — the whole point is that it records *your* opinion, not a consensus
that clusters everything between three and four stars.

## What it does today

- **Photograph a label** and have the producer, wine name, vintage, region,
  country and grapes filled in for you (Claude reads the label). Everything it
  returns is editable, and you can skip the photo and type it in instead.
- **Rate it** on four points: loved / liked / didn't like / really disliked.
- **Tag what stood out** — too sweet, too tannic, smooth, oaky, good value, and
  so on, grouped so they're quick to tap.
- **Free-text notes**, plus optional price, shop, and date.
- **Browse and search** everything you've logged, filtered to just the ones you
  liked or just the ones you didn't.
- **Read up on the grape.** Tap any grape on a wine and you get what it's like —
  acidity, body, tannin and sweetness on the same five-point scales every time,
  so grapes can be compared by eye — plus what it tastes of, where it grows,
  what to eat with it, a couple of things worth knowing, and which of your own
  bottles were made from it. **Grapes** on the log lists every variety you've
  drunk, most-drunk first.
- **Decode a label.** **Labels** is a glossary of what's actually printed on
  bottles — Reserva, Cru, Brut, Sur Lie, DOCG — searchable, with a
  pronunciation for the ones that are hard to say out loud, and a section for
  the words that are legally meaningless. It leads with the rule that unlocks
  most of a wine list: European labels name the place, everywhere else names
  the grape.
- **Installs to your phone's home screen** and runs full-screen like an app.

Deliberately not here yet: preference profiles and recommendations. Those want a
few dozen logged bottles to be any good — see [Where this goes next](#where-this-goes-next).

## Setup

You need a [Neon](https://neon.tech) database, an
[Anthropic API key](https://console.anthropic.com), and a
[Vercel](https://vercel.com) account. All three have free tiers that comfortably
cover personal use.

### 1. Configure

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable            | Where it comes from                                              |
| ------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`      | Neon dashboard → your project → Connection string (**pooled**)   |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys                                 |
| `APP_PASSCODE`      | You choose it. It's what unlocks the app on your phone.          |
| `AUTH_SECRET`       | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 2. Create the tables

```bash
npm run db:init
```

Safe to re-run; it only creates what's missing.

### 3. Run it

```bash
npm run dev
```

### 4. Deploy

Push to GitHub, import the repo in Vercel, and add the same four environment
variables under **Settings → Environment Variables**. Deploy.

Then on your phone, open the Vercel URL, enter your passcode, and add it to your
home screen — **Share → Add to Home Screen** on iOS, or **⋮ → Install app** on
Android. HTTPS is required for the camera, which Vercel gives you by default.

## How it's put together

| Piece            | Choice                       | Why                                                            |
| ---------------- | ---------------------------- | -------------------------------------------------------------- |
| Framework        | Next.js (App Router)         | One deployable for pages and API; first-class on Vercel        |
| Database         | Neon Postgres over HTTP      | No connection pool to manage from serverless functions          |
| Label reading    | Claude vision, server-side   | Handles supermarket own-label bottles that catalogues don't have |
| Grape notes      | Claude, cached in Postgres   | No wine-encyclopedia API to sign up for, and a grape doesn't change |
| Photos           | Base64 in Postgres           | One less service to wire up; photos are ~150 KB after downscaling |
| Auth             | One passcode, signed cookie  | It's a single-user app on a public URL                         |
| Styling          | Tailwind v4                  | —                                                               |
| Type             | Fraunces + Schibsted Grotesk | Both OFL, self-hosted at build, so no runtime call to Google    |

**On the type.** Fraunces (Undercase Type) for wine names and notes, Schibsted
Grotesk (Schibsted's newsroom grotesque) for everything else — chosen partly
because neither is the serif-plus-Inter combination every other product ships.
Fraunces carries an optical-size axis, so `font-optical-sizing: auto` lets the
browser thin the strokes for a 40px masthead and thicken them for a 17px card
title, from one font file. Two classes select the cut: `.serif-display` adds a
little of the WONK axis for character in headings, `.serif-text` drops it for
running text. Around 116 KB of font on first load, cached for a year after.

**On the look.** Bright warm paper, hairline rules, small letterspaced caps for
labels, and a serif reserved for wine names and notes. Bottle photos are the
only strong colour on the page, which is the point: the log is a gallery of
labels, and in a shop you recognise a bottle before you read its name. Rating
carries the one accent — wines you liked take the bordeaux, the rest stay grey,
so a screenful sorts itself before you read a word. Every text colour clears
WCAG AA against the background.

A few decisions worth knowing about:

- **Your API key never reaches the browser.** Label reading happens in a route
  handler; the phone only ever posts an image and gets JSON back.
- **Photos are downscaled in the browser** to 1400px before upload, so a 5 MB
  camera JPEG becomes ~150 KB. This is what keeps you inside Neon's free tier
  and makes uploads survive a bad supermarket signal.
- **The label reader is never load-bearing.** If it fails, is misconfigured, or
  the photo isn't a wine, you get a note explaining why and the form appears
  anyway with the photo attached. You can always log a wine by hand.
- **Grape notes are written once and kept.** The first time you open a grape it
  costs one Claude call and a few seconds; after that it's a row in Postgres.
  Every spelling that leads to a grape — what you typed, its proper name, its
  synonyms — is stored pointing at the same profile, so "Shiraz" and "Syrah"
  land on one page, and a word that turns out not to be a grape is remembered
  as such rather than re-asked on every visit. Bump `PROFILE_VERSION` in
  `lib/grape-profile.ts` to have them all rewritten.
- **The grape scales are fixed at five points and always drawn.** A scale that
  changes shape can't be compared across grapes, which is the only reason to
  draw one. Tannin is the exception: it's left off whites, where it would
  always read zero and teach nothing.
- **The grape notes say they're generated.** They're written by a model, not
  looked up in a reference book, so the page says so at the bottom. Same
  principle as the label reader: useful, editable by disbelief, never
  load-bearing.
- **The label glossary is hand-written and static.** Everything else the app
  knows, it asks a model for. Not this: it's settled, slow-moving knowledge
  where being wrong is worse than being absent, and the moment you want it —
  in a shop, or at a table, on one bar of signal — is the worst moment to be
  waiting on an API call. It's a prerendered page with no database behind it.
- **Tags are stored as ids, not labels** (`too_tannic`, not "Too tannic /
  harsh"), so the wording can change later without rewriting your history — and
  so a preference profile can just count ids.
- **Nothing is cached offline except the shell.** A stale log would be worse
  than an error message when you're standing in front of a shelf deciding.

## Layout

```
src/
  app/
    page.tsx              the log
    add/                  capture → read label → form
    wine/[id]/            one entry, and its edit form
    grapes/               every grape in your log, most-drunk first
    grape/[slug]/         one grape: scales, flavours, regions, your bottles
    labels/               the label glossary
    login/                passcode gate
    api/
      identify/           Claude reads a label photo
      photos/             upload and serve label photos
      wines/              CRUD
      auth/               login and lock
  components/             UI
  lib/
    taxonomy.ts           ratings, tags, wine types, shops, grape scales
    wines.ts              queries and input validation
    grapes.ts             name matching, the profile cache, log tallies
    grape-profile.ts      Claude writes one grape's entry
    label-terms.ts        the label glossary, written by hand
    text.ts               flattening names for matching
    image.ts              browser-side downscaling
    auth.ts               cookie signing
  proxy.ts                the passcode gate, in front of everything
scripts/
  init-db.mjs             schema
  gen-icons.mjs           generates the PWA icons
```

## Where this goes next

The data model is already shaped for these:

1. **A preference profile.** Count tag ids, grapes, regions and styles across
   what you rated highly versus poorly. "You reliably like smooth, fruity reds
   and dislike anything you've called too tannic."
2. **Recommendations restricted to what you can actually buy.** The `source`
   field is a fixed list of Irish supermarkets on purpose. A recommendation
   engine here should read from Tesco / Dunnes / SuperValu / Lidl / Aldi ranges
   and current offers, so it never suggests a bottle you can't find. This is the
   thing Vivino gets wrong for supermarket shopping.
3. **A shopping mode** — open it in the shop, filter to a supermarket, and see
   what you liked from there before.
4. **Region pages, the way grapes work now.** `grapes` / `grape_aliases` and the
   generate-once-then-cache path in `lib/grapes.ts` aren't grape-specific in
   anything but their column names; a region wants different axes (climate,
   which grapes it's known for, what a bottle from there tends to taste like)
   but the same machinery. Regions are already recorded on every wine, so the
   links have somewhere to point.
