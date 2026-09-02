"use client";

/** Longest edge a stored picture is scaled down to. */
const MAX_DIM = 1600;
/** Below this, a picture is small enough to keep byte-for-byte. */
const KEEP_AS_IS = 300 * 1024;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Turns a dropped, pasted or picked file into a data URL to embed in a note.
 * Screenshots off the clipboard are big PNGs, so anything oversized is scaled
 * down and re-encoded — a note with a dozen pictures should still be quick to
 * load and well inside the browser's storage budget.
 */
export async function toStoredImage(file: Blob): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // SVGs and anything the decoder refuses go in untouched.
    return readAsDataUrl(file);
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (file.size <= KEEP_AS_IS && longest <= MAX_DIM) {
    bitmap.close();
    return readAsDataUrl(file);
  }

  const scale = Math.min(1, MAX_DIM / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return readAsDataUrl(file);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // WebP keeps transparency and is far smaller than a PNG screenshot; a
  // browser without it falls back to PNG on its own.
  return canvas.toDataURL("image/webp", 0.86);
}

/**
 * The image files in a paste or a drop. A screenshot off the clipboard shows
 * up in `files` in some browsers and only in `items` in others, so check both
 * and drop the duplicates.
 */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  const found = [...data.files].filter((f) => f.type.startsWith("image/"));
  for (const item of data.items ?? []) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file && !found.some((f) => f.size === file.size && f.type === file.type)) found.push(file);
  }
  return found;
}
