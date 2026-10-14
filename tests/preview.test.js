import test from "node:test";
import assert from "node:assert/strict";
import { previewPlan } from "../src/preview.js";
import { localCatalog } from "../src/recommender.js";

test("happy tracks play a major arpeggio, low-joy tracks a minor one", () => {
  const happy = previewPlan({ previewHz: 440, mood: { joy: 90, energy: 50, chill: 40 } });
  const sad = previewPlan({ previewHz: 440, mood: { joy: 20, energy: 50, chill: 40 } });
  assert.equal(happy.mode, "major");
  assert.equal(sad.mode, "minor");
  assert.equal(happy.notes[1], 554.37); // major third above A4
  assert.equal(sad.notes[1], 523.25);   // minor third above A4
  assert.equal(happy.notes[3], 880);
});

test("more energy plays faster; very chill tracks use a soft sine", () => {
  const slow = previewPlan({ mood: { energy: 10, chill: 90, joy: 50 } });
  const fast = previewPlan({ mood: { energy: 95, chill: 10, joy: 50 } });
  assert.ok(fast.step < slow.step);
  assert.equal(slow.wave, "sine");
  assert.equal(fast.wave, "sawtooth");
});

test("every catalog track gets a different-sounding preview", () => {
  const keys = localCatalog.map((t) => { const p = previewPlan(t); return p.notes[0] + p.mode + p.step + p.wave; });
  assert.equal(new Set(keys).size, localCatalog.length);
});
