import { normalizeProfile } from "./recommender.js";

const MAX_TEXT = 80;

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function slug(text) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "track";
}

// Custom ids carry a prefix so they can never shadow a built-in track.
export function makeCustomTrack(input, takenIds = []) {
  const title = cleanText(input.title);
  if (!title) throw new Error("A track needs a title.");
  const artist = cleanText(input.artist) || "Unknown artist";
  const taken = new Set(takenIds);
  const base = `my-${slug(title)}`;
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return { id, title, artist, mood: normalizeProfile(input.mood || {}), custom: true };
}

export function sanitizeLibrary(raw) {
  if (!Array.isArray(raw)) return [];
  const tracks = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    try {
      const taken = tracks.map((t) => t.id);
      const track = makeCustomTrack(entry, taken);
      // Keep a stored id when it is still valid so favourites stay attached.
      if (/^my-[a-z0-9-]+$/.test(entry.id) && !taken.includes(entry.id)) track.id = entry.id;
      tracks.push(track);
    } catch {
      // Drop entries without a title rather than failing the whole library.
    }
  }
  return tracks;
}

export function mergeCatalog(builtIn, custom) {
  return [...builtIn, ...custom];
}
