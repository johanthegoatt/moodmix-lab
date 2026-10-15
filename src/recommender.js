export const localCatalog = [
  {
    id: "sunrise-lane",
    title: "Sunrise Lane",
    artist: "Local Echo",
    mood: { energy: 62, focus: 75, chill: 40, joy: 70 },
    previewHz: 440
  },
  {
    id: "neon-drift",
    title: "Neon Drift",
    artist: "Grid Steps",
    mood: { energy: 90, focus: 48, chill: 18, joy: 68 },
    previewHz: 520
  },
  {
    id: "coastal-paper",
    title: "Coastal Paper",
    artist: "North Fold",
    mood: { energy: 32, focus: 58, chill: 92, joy: 60 },
    previewHz: 330
  },
  {
    id: "steady-lines",
    title: "Steady Lines",
    artist: "Worklight",
    mood: { energy: 45, focus: 88, chill: 55, joy: 52 },
    previewHz: 392
  },
  {
    id: "city-smile",
    title: "City Smile",
    artist: "Cafe Orbit",
    mood: { energy: 74, focus: 62, chill: 36, joy: 94 },
    previewHz: 494
  },
  {
    id: "late-window",
    title: "Late Window",
    artist: "Mild Current",
    mood: { energy: 25, focus: 52, chill: 95, joy: 42 },
    previewHz: 294
  }
];

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function normalizeProfile(input) {
  return {
    energy: clamp(input.energy),
    focus: clamp(input.focus),
    chill: clamp(input.chill),
    joy: clamp(input.joy)
  };
}

export function scoreTrack(profile, track) {
  const safe = normalizeProfile(profile);
  const values = ["energy", "focus", "chill", "joy"];
  const totalDistance = values.reduce((sum, key) => sum + Math.abs(safe[key] - track.mood[key]), 0);
  return Number((100 - totalDistance / values.length).toFixed(2));
}

export function serendipityScore(profile, track) {
  const safe = normalizeProfile(profile);
  const values = ["energy", "focus", "chill", "joy"];
  const totalDistance = values.reduce((sum, key) => sum + Math.abs(safe[key] - track.mood[key]), 0);
  return Number((totalDistance / values.length).toFixed(2));
}

export function buildPlaylist(profile, catalog = localCatalog, limit = 5) {
  const safeLimit = Math.max(1, Number(limit) || 1);
  return catalog
    .map((track) => ({
      ...track,
      score: scoreTrack(profile, track),
      serendipity: serendipityScore(profile, track)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
}

function pickWithDiversity(profile, sorted, limit, diversityWeight = 50) {
  const selected = [];
  const remaining = [...sorted];
  const seenArtists = new Set();
  const weight = clamp(diversityWeight) / 100;

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const repeatPenalty = seenArtists.has(candidate.artist) ? 8 + weight * 14 : 0;
      const surpriseBonus = candidate.serendipity * weight * 0.35;
      const adjusted = candidate.score + surpriseBonus - repeatPenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    if (!next) continue;
    selected.push(next);
    seenArtists.add(next.artist);
  }

  return selected;
}

// Energy ramp changes the order, never the picks. It used to take the top
// 2 x limit matches and keep the lowest-energy ones, so a high-energy
// profile got its worst matches. Now the best `limit` tracks are chosen
// first and then played calm to lively, the gradual build that playlist
// studies find listeners prefer over big jumps between neighbours
// (Bonnin & Jannach, ACM Computing Surveys 2014, "smooth transitions").
function applyEnergyRamp(picked, limit) {
  return [...picked]
    .slice(0, limit)
    .sort((left, right) => left.mood.energy - right.mood.energy || right.score - left.score);
}

const MOODS = ["energy", "focus", "chill", "joy"];
const moodDistance = (a, b) => Math.hypot(...MOODS.map((key) => a.mood[key] - b.mood[key]));

function pathLength(order) {
  let total = 0;
  for (let i = 1; i < order.length; i += 1) total += moodDistance(order[i - 1], order[i]);
  return total;
}

// Smooth flow: the order with the smallest total mood change from track to
// track, across all four moods rather than energy alone. Starts at the
// calmest track, walks to the nearest unplayed one, then 2-opt swaps any
// stretch that reverses into a shorter path (the standard tour heuristics;
// a playlist is a short, open path, so this lands at or near the best order).
export function smoothFlow(tracks) {
  if (tracks.length < 3) return [...tracks].sort((a, b) => a.mood.energy - b.mood.energy);
  const left = [...tracks].sort((a, b) => a.mood.energy - b.mood.energy || a.id.localeCompare(b.id));
  const order = [left.shift()];
  while (left.length) {
    const last = order[order.length - 1];
    let best = 0;
    for (let i = 1; i < left.length; i += 1) {
      if (moodDistance(last, left[i]) < moodDistance(last, left[best])) best = i;
    }
    order.push(left.splice(best, 1)[0]);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (pathLength(candidate) < pathLength(order) - 1e-9) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

export function flowRoughness(tracks) {
  return tracks.length < 2 ? 0 : pathLength(tracks) / (tracks.length - 1);
}

export function buildPlaylistAdvanced(profile, catalog = localCatalog, limit = 5, options = {}) {
  const scored = buildPlaylist(profile, catalog, Math.max(1, catalog.length));
  const safeLimit = Math.max(1, Number(limit) || 1);
  const diversityWeight = clamp(options.diversityWeight ?? 50);

  const picked = options.discovery
    ? pickWithDiversity(profile, scored, safeLimit, diversityWeight)
    : scored.slice(0, safeLimit);

  if (options.order === "smooth") return smoothFlow(picked);
  if (options.energyRamp || options.order === "ramp") return applyEnergyRamp(picked, safeLimit);
  return picked;
}
