"use client";

/** One line of a page: a paragraph, a bullet, or a checklist item. */
export interface OutlineItem {
  text: string;
  /** Set only for checklist items — a plain line has no box to tick. */
  done?: boolean;
}

/** How many lines of a page the index keeps, and how long each may be. */
const MAX_ITEMS = 12;
const MAX_TEXT = 120;

const BLOCKS = new Set(["p", "h1", "h2", "h3", "blockquote", "pre"]);

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT - 1)}…` : flat;
}

/**
 * Walks a page's blocks in order, pairing each list item with its `li` so a
 * caller can tick the same one it rendered. Checklist state lives in the HTML
 * (`data-checked` on the item), which is why this reads the markup rather than
 * the plain text — the text alone cannot say what is ticked.
 */
function walk(root: Element): { item: OutlineItem; li: Element | null }[] {
  const out: { item: OutlineItem; li: Element | null }[] = [];
  for (const el of Array.from(root.children)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== "li") continue;
        const text = clip(li.textContent ?? "");
        if (!text) continue;
        const checked = li.getAttribute("data-checked");
        out.push({
          item: { text, ...(checked === null ? {} : { done: checked === "true" }) },
          li,
        });
      }
    } else if (BLOCKS.has(tag)) {
      const text = clip(el.textContent ?? "");
      if (text) out.push({ item: { text }, li: null });
    }
    if (out.length >= MAX_ITEMS) break;
  }
  return out.slice(0, MAX_ITEMS);
}

function parse(html: string): Document | null {
  if (typeof DOMParser === "undefined") return null;
  return new DOMParser().parseFromString(html, "text/html");
}

/** The page as a list of lines, in the order they appear. */
export function outlineOf(html: string, fallbackText = ""): OutlineItem[] {
  const doc = parse(html);
  if (!doc) {
    // No DOM to parse with; the plain text still gives the lines, just not
    // which of them are ticked.
    return fallbackText
      .split(/\n+/)
      .map((line) => clip(line))
      .filter(Boolean)
      .slice(0, MAX_ITEMS)
      .map((text) => ({ text }));
  }
  return walk(doc.body).map((e) => e.item);
}

/**
 * Flips the checklist item at `index`, returning the page's new HTML — or
 * null if it is not a checklist item, or if `expected` no longer matches,
 * which means the page changed since the caller last read it.
 */
export function toggleOutlineItem(html: string, index: number, expected: string): string | null {
  const doc = parse(html);
  if (!doc) return null;

  const entry = walk(doc.body)[index];
  if (!entry?.li || entry.item.done === undefined) return null;
  if (entry.item.text !== clip(expected)) return null;

  const done = !entry.item.done;
  entry.li.setAttribute("data-checked", String(done));
  const box = entry.li.querySelector('input[type="checkbox"]');
  if (box) {
    if (done) box.setAttribute("checked", "checked");
    else box.removeAttribute("checked");
  }
  return doc.body.innerHTML;
}
