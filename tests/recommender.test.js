import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPlaylist,
  buildPlaylistAdvanced,
  normalizeProfile,
  scoreTrack,
  serendipityScore
} from "../src/recommender.js";

test("normalizeProfile clamps values", () => {
  const profile = normalizeProfile({ energy: -5, focus: 33, chill: 150, joy: "90" });
  assert.deepEqual(profile, { energy: 0, focus: 33, chill: 100, joy: 90 });
});

test("scoreTrack returns higher score for closer mood matches", () => {
  const near = scoreTrack(
    { energy: 60, focus: 70, chill: 50, joy: 80 },
    { mood: { energy: 62, focus: 72, chill: 52, joy: 82 } }
  );
  const far = scoreTrack(
    { energy: 60, focus: 70, chill: 50, joy: 80 },
    { mood: { energy: 10, focus: 20, chill: 90, joy: 15 } }
  );
  assert.equal(near > far, true);
});

test("buildPlaylist sorts by score and respects limit", () => {
  const profile = { energy: 70, focus: 60, chill: 30, joy: 90 };
  const playlist = buildPlaylist(profile, undefined, 3);

  assert.equal(playlist.length, 3);
  assert.equal(playlist[0].score >= playlist[1].score, true);
  assert.equal(playlist[1].score >= playlist[2].score, true);
  assert.equal(typeof playlist[0].serendipity, "number");
});

test("buildPlaylistAdvanced discovery mode prefers artist diversity", () => {
  const catalog = [
    { id: "a1", title: "A1", artist: "ArtistA", mood: { energy: 80, focus: 80, chill: 20, joy: 70 } },
    { id: "a2", title: "A2", artist: "ArtistA", mood: { energy: 81, focus: 79, chill: 18, joy: 69 } },
    { id: "b1", title: "B1", artist: "ArtistB", mood: { energy: 79, focus: 77, chill: 24, joy: 71 } }
  ];
  const profile = { energy: 80, focus: 80, chill: 20, joy: 70 };

  const precision = buildPlaylistAdvanced(profile, catalog, 2, { discovery: false });
  const discovery = buildPlaylistAdvanced(profile, catalog, 2, { discovery: true });

  assert.equal(precision[0].artist, "ArtistA");
  assert.equal(precision[1].artist, "ArtistA");
  assert.equal(discovery[0].artist === discovery[1].artist, false);
});

test("serendipityScore grows when profile differs more from a track", () => {
  const near = serendipityScore(
    { energy: 60, focus: 60, chill: 60, joy: 60 },
    { mood: { energy: 59, focus: 58, chill: 62, joy: 61 } }
  );
  const far = serendipityScore(
    { energy: 60, focus: 60, chill: 60, joy: 60 },
    { mood: { energy: 10, focus: 10, chill: 10, joy: 10 } }
  );
  assert.equal(far > near, true);
});

test("buildPlaylistAdvanced supports energy ramp sorting", () => {
  const profile = { energy: 80, focus: 80, chill: 20, joy: 70 };
  const playlist = buildPlaylistAdvanced(profile, undefined, 4, { energyRamp: true });

  for (let i = 1; i < playlist.length; i += 1) {
    assert.equal(playlist[i - 1].mood.energy <= playlist[i].mood.energy, true);
  }
});
