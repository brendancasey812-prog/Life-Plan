"use client";

/** One line of a page: a paragraph, a bullet, or a checklist item. */
export interface OutlineItem {
  text: string;
  /** Whether it is ticked. Undefined for a line that cannot carry a box. */
  done?: boolean;
  /** False for a heading, quote or code block, which stay as they are. */
  checkable: boolean;
}

/** How many lines of a page the index keeps, and how long each may be. */
const MAX_ITEMS = 12;
const MAX_TEXT = 120;

/** Blocks that can hold a goal, and blocks that are structure around one. */
const GOAL_BLOCKS = new Set(["p"]);
const OTHER_BLOCKS = new Set(["h1", "h2", "h3", "blockquote", "pre"]);

type Kind = "task" | "item" | "para" | "other";

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT - 1)}…` : flat;
}

/**
 * Walks a page's blocks in order, keeping the element behind each line so a
 * caller can tick the same one it rendered. Checklist state lives in the HTML
 * (`data-checked` on the item), which is why this reads the markup rather than
 * the plain text — the text alone cannot say what is ticked.
 */
function walk(root: Element): { item: OutlineItem; el: Element; kind: Kind }[] {
  const out: { item: OutlineItem; el: Element; kind: Kind }[] = [];
  for (const el of Array.from(root.children)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== "li") continue;
        const text = clip(li.textContent ?? "");
        if (!text) continue;
        const checked = li.getAttribute("data-checked");
        out.push(
          checked === null
            ? { item: { text, done: false, checkable: true }, el: li, kind: "item" }
            : { item: { text, done: checked === "true", checkable: true }, el: li, kind: "task" },
        );
      }
    } else if (GOAL_BLOCKS.has(tag) || OTHER_BLOCKS.has(tag)) {
      const text = clip(el.textContent ?? "");
      if (!text) continue;
      const goal = GOAL_BLOCKS.has(tag);
      out.push({
        item: { text, ...(goal ? { done: false } : {}), checkable: goal },
        el,
        kind: goal ? "para" : "other",
      });
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
      .map((text) => ({ text, done: false, checkable: true }));
  }
  return walk(doc.body).map((e) => e.item);
}

/** The shape Tiptap stores a checklist item in. */
function makeTaskItem(doc: Document, innerHtml: string, checked: boolean): HTMLElement {
  const li = doc.createElement("li");
  li.setAttribute("data-checked", String(checked));
  li.setAttribute("data-type", "taskItem");

  const label = doc.createElement("label");
  const box = doc.createElement("input");
  box.setAttribute("type", "checkbox");
  if (checked) box.setAttribute("checked", "checked");
  label.append(box, doc.createElement("span"));

  const body = doc.createElement("div");
  body.innerHTML = /^\s*<(p|h[1-6]|blockquote|pre)\b/i.test(innerHtml)
    ? innerHtml
    : `<p>${innerHtml}</p>`;

  li.append(label, body);
  return li;
}

function setChecked(li: Element, checked: boolean): void {
  li.setAttribute("data-checked", String(checked));
  const box = li.querySelector('input[type="checkbox"]');
  if (!box) return;
  if (checked) box.setAttribute("checked", "checked");
  else box.removeAttribute("checked");
}

/**
 * Ticks or unticks the line at `index`, returning the page's new HTML.
 *
 * A line that is not a checklist item yet becomes one, so the tick has
 * somewhere to live that every other view of the page can read: a paragraph
 * turns into a one-item checklist, and a bulleted list turns into a checklist
 * with only the ticked item checked. Headings, quotes and code blocks are
 * left alone — they are not goals.
 *
 * Returns null if the line cannot carry a box, or if `expected` no longer
 * matches, which means the page changed since the caller last read it.
 */
export function toggleOutlineItem(html: string, index: number, expected: string): string | null {
  const doc = parse(html);
  if (!doc) return null;

  const entry = walk(doc.body)[index];
  if (!entry || !entry.item.checkable) return null;
  if (entry.item.text !== clip(expected)) return null;

  const done = !entry.item.done;

  if (entry.kind === "task") {
    setChecked(entry.el, done);
    return doc.body.innerHTML;
  }

  if (entry.kind === "para") {
    const list = doc.createElement("ul");
    list.setAttribute("data-type", "taskList");
    list.append(makeTaskItem(doc, entry.el.outerHTML, done));
    entry.el.replaceWith(list);
    return doc.body.innerHTML;
  }

  // A plain bullet: the whole list becomes a checklist, since a list cannot
  // be half one kind and half the other.
  const list = entry.el.parentElement;
  if (!list) return null;
  list.setAttribute("data-type", "taskList");
  for (const li of Array.from(list.children)) {
    if (li.tagName.toLowerCase() !== "li") continue;
    list.replaceChild(makeTaskItem(doc, li.innerHTML, li === entry.el ? done : false), li);
  }
  return doc.body.innerHTML;
}
