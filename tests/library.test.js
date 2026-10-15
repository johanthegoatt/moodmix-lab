import test from "node:test";
import assert from "node:assert/strict";
import { makeCustomTrack, mergeCatalog, sanitizeLibrary } from "../src/library.js";
import { buildPlaylistAdvanced, localCatalog } from "../src/recommender.js";
import { loadLibrary, saveLibrary } from "../src/store.js";

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

test("custom track gets a prefixed unique id and clamped mood", () => {
  const first = makeCustomTrack({ title: "  Late  Train ", mood: { energy: 140, joy: -5 } });
  assert.equal(first.id, "my-late-train");
  assert.equal(first.title, "Late Train");
  assert.equal(first.artist, "Unknown artist");
  assert.deepEqual(first.mood, { energy: 100, focus: 0, chill: 0, joy: 0 });
  const second = makeCustomTrack({ title: "Late Train" }, [first.id]);
  assert.equal(second.id, "my-late-train-2");
});

test("titles are required and kept as plain text", () => {
  assert.throws(() => makeCustomTrack({ title: "   " }));
  const track = makeCustomTrack({ title: "<img src=x onerror=alert(1)>" });
  assert.equal(track.title, "<img src=x onerror=alert(1)>");
  assert.match(track.id, /^my-[a-z0-9-]+$/);
});

test("sanitizeLibrary drops junk and dedupes ids", () => {
  const library = sanitizeLibrary([{ title: "A" }, null, { title: "" }, { title: "A" }, "x"]);
  assert.deepEqual(library.map((t) => t.id), ["my-a", "my-a-2"]);
  assert.deepEqual(sanitizeLibrary({ not: "an array" }), []);
  const kept = sanitizeLibrary([{ id: "my-a-2", title: "A" }, { id: "evil", title: "B" }]);
  assert.deepEqual(kept.map((t) => t.id), ["my-a-2", "my-b"]);
});

test("custom tracks join recommendations", () => {
  const mine = makeCustomTrack({ title: "Exact Fit", mood: { energy: 11, focus: 22, chill: 33, joy: 44 } });
  const playlist = buildPlaylistAdvanced({ energy: 11, focus: 22, chill: 33, joy: 44 }, mergeCatalog(localCatalog, [mine]), 3);
  assert.equal(playlist[0].id, mine.id);
});

test("library round-trips through storage and survives bad JSON", () => {
  const storage = memoryStorage();
  saveLibrary([{ title: "A" }], storage);
  assert.deepEqual(loadLibrary(storage), [{ title: "A" }]);
  storage.setItem("moodmix:library:v1", "{oops");
  assert.deepEqual(loadLibrary(storage), []);
});
