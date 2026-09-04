# 🫧 Life Plan

A whole life, laid out as bubbles you can open, rename, add to and delete —
plus a 100-year week grid to plan against, and a notebook where every bubble
and every week gets its own page for writing, screenshots and pictures.

Everything lives in your browser. There is no account, no server and no
network call; export a JSON copy from **Settings** to move it.

## Tabs

| Tab | What it does |
| --- | --- |
| **My Life** | The entry tab: a board of widgets you arrange yourself. |
| **Bubbles** | One `My Life` bubble. Open it for every decade, a decade for its years, a year for its months — and add your own bubbles at any depth. |
| **Weeks** | Rows are ages 0 – 100, columns are the 52 weeks of each year. Click any week to write down what it is for and tick it off. |
| **Life Map** | The areas the plan is built around: Personal Health (mental, physical, sexual), Outdoors (camping and hiking, biking, eco footprint), Music, Finance and Craftmanship. |
| **Yearly Goals — 2026** | A notepad for this year, with picture boxes beside it. |
| **Monthly Goals — September 2026** | The same, for this month. |
| **Notes** | Every page in one place — the ones hanging off bubbles and weeks, plus any you start on their own — searchable across their whole text. |

A settings box sits in the top-right corner of every tab: light / dark /
system, your name, date of birth, how far to plan, and export / import / reset.

## Colour

The palette is deliberately quiet: desaturated sage, slate and clay rather
than saturated primaries, and bubbles muted well below a primary so a ring of
them reads calm. Surfaces are semi-opaque and blurred behind (`.pane`), so a
card sits over the page wash instead of covering it — solid and shaded rather
than a flat block.

## Light and dark

Every colour is written once in [`globals.css`](src/app/globals.css) — light
value first — and `light-dark()` picks between them from the root's
`color-scheme`. Two consequences worth knowing:

- **Following the device needs no JavaScript at all.** It is right on the very
  first paint, and it keeps up when the device flips theme, with no script and
  no listener.
- **An explicit choice is just a class** (`.light` / `.dark`) on `<html>`,
  which is the only thing those classes do.

Numbers cannot go through `light-dark()`, so everything numeric — the bubble
lightness, saturation and alpha — is derived from one `--dk` switch that is
`0` in light and `1` in dark, rather than written out twice.

A bubble keeps its hue in both themes. Its labels are white, and the same
lightness reads very differently by hue, so the warm half of the wheel is
pulled down until every bubble carries its text.

Since the choice lives in the browser, restoring it before the first paint
needs a blocking script, and Next strips an inline one from the tree while
`next/script` only runs at hydration. So
[`scripts/inline-theme.mjs`](scripts/inline-theme.mjs) injects one into every
exported page after the build. Without it the only cost would be a blink of
the device's theme, and only for someone whose choice disagrees with it.

## The entry tab

**My Life** is a board of cards. Hit **Customise** to add widgets, drag them
into order, set each one to span one, two or three columns, or drop one you do
not want; the layout is saved with everything else, and **Reset layout** puts
the default back. The same widget can appear more than once.

| Widget | What it shows |
| --- | --- |
| **Age** | How old you are, how far through this year of your life, and how long until the next birthday. |
| **Month & year** | Today's date, and which week of your year it falls in. |
| **Yearly goals** | This year's page. |
| **Monthly goals** | This month's page. |
| **Weeks lived** | How much of the 100-year grid is behind you. |
| **My Life bubbles** | Into the decades. |
| **Life Map** | The areas you build around. |
| **Recent pages** | What you wrote last. |

The two goal widgets are not summaries of anything — they read the very page
the goal tabs and the bubbles open, so a line written on any of the three
shows up on the other two, and the widget names the bubble it came from.

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
npm run build   # static export to ./out, then inject the theme script
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
