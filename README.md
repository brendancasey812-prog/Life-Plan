# 🫧 Life Plan

A whole life, laid out as bubbles you can open, rename, add to and delete —
plus a 100-year week grid to plan against.

Everything lives in your browser's local storage. There is no account, no
server and no network call; export a JSON copy from **Settings** to move it.

## Tabs

| Tab | What it does |
| --- | --- |
| **My Life** | One `My Life` bubble. Open it for every decade, a decade for its years, a year for its months — and add your own bubbles at any depth. |
| **Weeks** | Rows are ages 0 – 100, columns are the 52 weeks of each year. Click any week to write down what it is for and tick it off. |
| **Life Map** | The areas the plan is built around: Personal Health (mental, physical, sexual), Outdoors (camping and hiking, biking, eco footprint), Music, Finance and Craftmanship. |

A settings box sits in the top-right corner of every tab: your name, date of
birth, how far to plan, and export / import / reset.

## Bubbles

Every bubble behaves the same way, whichever tab it is on:

- **Open** it — click it to drill in. A breadcrumb across the top walks back out.
- **Add** one — the dashed `+` circle is part of the ring, so a new bubble
  simply joins it.
- **Rename** or **delete** one — hover a bubble for its ✎ and 🗑 buttons.
  Deleting takes everything inside it, after a confirm.
- **Note** on it — the strip under the canvas holds free text for whatever
  bubble you are currently inside.

### The layout re-solves itself

There is no fixed grid. [`src/lib/layout.ts`](src/lib/layout.ts) places the
children on one or more ellipses sized to the canvas, spread by *arc length*
so neighbours stay evenly spaced on a wide screen as well as a narrow one, and
then picks the single largest bubble radius that still clears

- the nearest neighbour,
- the bubble at the centre, and
- the edge of the canvas.

So adding a bubble, deleting one, or resizing the window re-solves the whole
arrangement — the bubbles grow, shrink and slide into their new places, and
nothing ever overlaps or spills off the page. Past fourteen children the ring
splits into concentric rings, up to four.

### The timeline is generated as you go

Building 1,300-odd bubbles up front would be wasteful, so the decades, years
and months in **My Life** are created the first time you open their parent
([`openBubble`](src/lib/store.ts)). After that they are ordinary bubbles: rename
them, delete them, add siblings.

## Data

One store — [`src/lib/store.ts`](src/lib/store.ts) — holds the settings, both
bubble trees and the week grid, persisted to local storage under `life-plan-v1`.
Week cells are keyed `age:week` and empty ones are dropped rather than stored.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # static export to ./out
```

## Deploying

`npm run build` is a static export, so any static host works. Pushing to `main`
builds and publishes to GitHub Pages via
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) — set
**Settings → Pages → Source** to *GitHub Actions* once, and the site appears at
`https://brendancasey812-prog.github.io/Life-Plan/`. The `BUILD_TARGET=pages`
env var is what adds that `/Life-Plan/` path prefix; a root-hosted deploy needs
no env vars at all.

## Stack

Next.js 16 (App Router, static export) · React 19 · TypeScript · Tailwind CSS 4
· Zustand · lucide-react.
