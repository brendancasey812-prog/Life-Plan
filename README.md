# 🫧 Life Plan

A whole life, laid out as bubbles you can open, rename, add to and delete —
plus a 100-year week grid to plan against, and a notebook where every bubble
and every week gets its own page for writing, screenshots and pictures.

Everything lives in your browser. There is no account, no server and no
network call; export a JSON copy from **Settings** to move it.

## Tabs

| Tab | What it does |
| --- | --- |
| **My Life** | One `My Life` bubble. Open it for every decade, a decade for its years, a year for its months — and add your own bubbles at any depth. |
| **Weeks** | Rows are ages 0 – 100, columns are the 52 weeks of each year. Click any week to write down what it is for and tick it off. |
| **Life Map** | The areas the plan is built around: Personal Health (mental, physical, sexual), Outdoors (camping and hiking, biking, eco footprint), Music, Finance and Craftmanship. |
| **Yearly Goals — 2026** | A notepad for this year, with picture boxes beside it. |
| **Monthly Goals — September 2026** | The same, for this month. |
| **Notes** | Every page in one place — the ones hanging off bubbles and weeks, plus any you start on their own — searchable across their whole text. |

A settings box sits in the top-right corner of every tab: your name, date of
birth, how far to plan, and export / import / reset.

## Bubbles

Every bubble behaves the same way, whichever tab it is on:

- **Open** it — click it to drill in. A breadcrumb across the top walks back out.
- **Add** one — the dashed `+` circle is part of the ring, so a new bubble
  simply joins it.
- **Rename** or **delete** one — hover a bubble for its ✎ and 🗑 buttons.
  Deleting takes everything inside it, after a confirm.
- **Write** on it — the strip under the canvas opens a full note page for
  whichever bubble you are inside, and a dot on a bubble means it has one.

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

## The goal tabs

**Yearly Goals** and **Monthly Goals** are not a second copy of anything. Each
one opens the page behind the matching bubble in **My Life** — this year's tab
is the `Age 25` bubble, this month's is the `September` bubble under it — so
writing in either place shows up in the other, pictures included. The chip in
the header names the bubble it is attached to.

Both dates come from the clock in your browser, not from the build, so the tabs
follow the calendar rather than going stale. My Life's timeline is generated as
it is opened, so a tab builds whatever part of it the period needs on first
visit.

## Notes

Every bubble and every week cell has a page behind it, and the **Notes** tab
lists them all alongside pages you start on their own. A page is a rich
document, not a text box:

- **Formatting** — headings, bold / italic / underline / strikethrough,
  highlight, links, quotes, code blocks, dividers.
- **Lists** — bulleted, numbered, and checklists whose boxes you can tick.
- **Pictures** — paste a screenshot straight into the text, drag a file onto
  the page, or pick one; then size it small, medium or full width, or delete
  it.
- **Picture boxes** — a page also has a board of picture boxes beside it,
  which take a click, a drop or a paste. They belong to the page, so the ones
  pinned on a goal tab are there on the bubble too.

Pages save themselves as you type. The **Notes** tab searches every page's full
text, so a note written on a month bubble two years out is still findable.

### Where it all goes

Pasted screenshots are far too big for local storage's few megabytes, so the
two are split:

| What | Where |
| --- | --- |
| Settings, bubble trees, week grid, page list, one excerpt per page | `localStorage` (`life-plan-v1`) |
| Note bodies — the HTML and the pictures inside it | IndexedDB (`life-plan-notes`) |

That excerpt is what draws the note dots, the preview strips and the search
results without ever loading a page's pictures.
[`src/lib/image.ts`](src/lib/image.ts) scales anything oversized down to
1600px and re-encodes it, so a clipboard screenshot costs kilobytes rather
than megabytes. Export writes both halves into one JSON file; import puts them
back.

## Data

One store — [`src/lib/store.ts`](src/lib/store.ts) — holds the settings, both
bubble trees, the week grid and the note index, persisted under `life-plan-v1`.
Week cells are keyed `age:week` and empty ones are dropped rather than stored.
A plan saved before the editor existed is migrated on load: each old plain-text
note becomes a page.

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
· Zustand · Tiptap · lucide-react.
