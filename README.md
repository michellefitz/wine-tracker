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
    login/                passcode gate
    api/
      identify/           Claude reads a label photo
      photos/             upload and serve label photos
      wines/              CRUD
      auth/               login and lock
  components/             UI
  lib/
    taxonomy.ts           ratings, tags, wine types, shops
    wines.ts              queries and input validation
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
