// A short arpeggio that sounds like the track's mood, instead of one beep
// that sounded the same for every track. The cues are the ones music
// emotion research finds strongest (Gabrielsson & Lindström 2010, in the
// Handbook of Music and Emotion; Juslin & Laukka 2003): mode carries
// valence (major sounds happy, minor sad), tempo carries arousal, and a
// brighter timbre sounds more active than a soft one.
const MAJOR = [0, 4, 7, 12];
const MINOR = [0, 3, 7, 12];

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function previewPlan(track) {
  const mood = track.mood || {};
  const joy = clamp(mood.joy);
  const energy = clamp(mood.energy);
  const chill = clamp(mood.chill);
  const root = Number(track.previewHz) > 0 ? Number(track.previewHz) : 440;
  const steps = joy >= 50 ? MAJOR : MINOR;
  // 0.42 s per note at energy 0 down to 0.12 s at energy 100.
  const step = Number((0.42 - energy * 0.003).toFixed(3));
  const wave = chill >= 70 ? "sine" : energy >= 75 ? "sawtooth" : "triangle";
  const notes = steps.map((semi) => Number((root * 2 ** (semi / 12)).toFixed(2)));
  return { notes, step, wave, mode: joy >= 50 ? "major" : "minor", length: Number((step * notes.length + 0.3).toFixed(3)) };
}
