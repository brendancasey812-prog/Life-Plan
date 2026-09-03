import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Puts a blocking snippet at the top of every exported page's <head> so an
 * explicit Light or Dark choice is restored before the first paint.
 *
 * The stylesheet already follows the device on its own, so this only matters
 * when someone picked a theme their device disagrees with — without it they
 * would see their device's theme for a moment before hydration corrects it.
 * Next strips an inline <script> from the tree and `next/script` only runs at
 * hydration, so injecting it after the export is the way to get one that
 * genuinely blocks.
 */
const OUT = "out";
const KEY = "life-plan-theme";
const SOURCE_OF_TRUTH = "src/lib/theme.ts";

const SNIPPET =
  `<script>(function(){try{var t=localStorage.getItem("${KEY}");var r=document.documentElement;` +
  `r.classList.toggle("light",t==="light");r.classList.toggle("dark",t==="dark");}catch(e){}})();</script>`;

/** The key is written out here too, so make sure it has not drifted. */
async function checkKey() {
  const source = await readFile(SOURCE_OF_TRUTH, "utf8");
  if (!source.includes(`"${KEY}"`)) {
    throw new Error(
      `Storage key "${KEY}" is not in ${SOURCE_OF_TRUTH} — the two have drifted apart.`,
    );
  }
}

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

await checkKey();

let touched = 0;
for await (const file of htmlFiles(OUT)) {
  const html = await readFile(file, "utf8");
  if (html.includes(KEY)) continue;
  const at = html.indexOf("<head>");
  if (at === -1) continue;
  await writeFile(file, html.slice(0, at + 6) + SNIPPET + html.slice(at + 6));
  touched++;
}
console.log(`inline-theme: ${touched} page(s)`);
