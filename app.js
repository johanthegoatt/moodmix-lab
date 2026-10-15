import { buildPlaylistAdvanced, flowRoughness, localCatalog, normalizeProfile } from "./src/recommender.js";
import { previewPlan } from "./src/preview.js";
import { loadFavorites, loadProfiles, saveFavorites, saveProfiles } from "./src/store.js";

const sliders = {
  energy: document.getElementById("energy"),
  focus: document.getElementById("focus"),
  chill: document.getElementById("chill"),
  joy: document.getElementById("joy")
};

const playlistEl = document.getElementById("playlist");
const favoritesEl = document.getElementById("favorites");
const profileEl = document.getElementById("profile");
const refreshBtn = document.getElementById("refresh");
const discoveryCheckbox = document.getElementById("discovery");
const orderSelect = document.getElementById("order");
const diversitySlider = document.getElementById("diversity");
const diversityValueEl = document.getElementById("diversity-value");
const presetNameInput = document.getElementById("preset-name");
const savePresetBtn = document.getElementById("save-preset");
const presetSelect = document.getElementById("preset-select");

let audioCtx;
const profiles = loadProfiles();
const favorites = new Set(loadFavorites());

function profileFromUi() {
  return normalizeProfile({
    energy: sliders.energy.value,
    focus: sliders.focus.value,
    chill: sliders.chill.value,
    joy: sliders.joy.value
  });
}

function applyProfile(profile) {
  const safe = normalizeProfile(profile);
  sliders.energy.value = safe.energy;
  sliders.focus.value = safe.focus;
  sliders.chill.value = safe.chill;
  sliders.joy.value = safe.joy;
}

function renderPresetOptions() {
  const names = Object.keys(profiles).sort();
  const previous = presetSelect.value;
  presetSelect.innerHTML = '<option value="">Load Preset...</option>';

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    presetSelect.append(option);
  }

  if (names.includes(previous)) {
    presetSelect.value = previous;
  }
}

let stopPreview = null;

async function playPreview(trackId) {
  const track = localCatalog.find((item) => item.id === trackId);
  if (!track) return;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Browsers start the context suspended until a click; resume it, and
  // cut off a preview that is still playing so two never overlap.
  if (audioCtx.state === "suspended") await audioCtx.resume();
  if (stopPreview) stopPreview();

  const plan = previewPlan(track);
  const start = audioCtx.currentTime + 0.02;
  const master = audioCtx.createGain();
  master.gain.value = 0.9;
  master.connect(audioCtx.destination);
  const oscillators = plan.notes.map((hz, index) => {
    const at = start + index * plan.step;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = plan.wave;
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(plan.wave === "sawtooth" ? 0.06 : 0.12, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + plan.step + 0.25);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(at);
    oscillator.stop(at + plan.step + 0.3);
    return oscillator;
  });
  stopPreview = () => {
    master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
    oscillators.forEach((oscillator) => { try { oscillator.stop(audioCtx.currentTime + 0.1); } catch {} });
    stopPreview = null;
  };
}

function render() {
  const profile = profileFromUi();
  const playlist = buildPlaylistAdvanced(profile, localCatalog, 5, {
    discovery: discoveryCheckbox.checked,
    order: orderSelect.value,
    diversityWeight: Number(diversitySlider.value || 50)
  });
  const mode = discoveryCheckbox.checked ? "discovery" : "precision";
  const orderNames = { match: "best match first", ramp: "energy ramp", smooth: "smooth flow" };
  const rampMode = orderNames[orderSelect.value];
  const diversityWeight = Number(diversitySlider.value || 50);
  diversityValueEl.textContent = String(diversityWeight);

  const roughness = flowRoughness(playlist).toFixed(0);
  profileEl.textContent = `Mode ${mode} (${rampMode}, diversity ${diversityWeight}, average step ${roughness}) => energy ${profile.energy}, focus ${profile.focus}, chill ${profile.chill}, joy ${profile.joy}`;
  playlistEl.innerHTML = "";

  for (const track of playlist) {
    const favoriteLabel = favorites.has(track.id) ? "Unfavorite" : "Favorite";
    const item = document.createElement("li");
    item.className = "track";
    const plan = previewPlan(track);
    const heading = document.createElement("h3");
    heading.textContent = `${track.title} - ${track.artist}`;
    const meta = document.createElement("p");
    meta.textContent = `Match score: ${track.score} | Serendipity: ${track.serendipity}`;
    const preview = document.createElement("button");
    preview.type = "button";
    preview.dataset.preview = track.id;
    preview.textContent = `Hear the mood (${plan.mode}, ${plan.step < 0.25 ? "quick" : "slow"})`;
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "fav-btn";
    favorite.dataset.favoriteId = track.id;
    favorite.textContent = favoriteLabel;
    item.append(heading, meta, preview, favorite);
    playlistEl.appendChild(item);
  }

  renderFavorites();
}

function renderFavorites() {
  favoritesEl.innerHTML = "";
  const tracks = localCatalog.filter((track) => favorites.has(track.id));

  if (tracks.length === 0) {
    const item = document.createElement("li");
    item.className = "track";
    item.textContent = "No favorites yet. Add tracks from Top Matches.";
    favoritesEl.append(item);
    return;
  }

  tracks.sort((left, right) => left.title.localeCompare(right.title));
  for (const track of tracks) {
    const item = document.createElement("li");
    item.className = "track";
    item.innerHTML = `
      <h3>${track.title} - ${track.artist}</h3>
      <p>Mood profile: energy ${track.mood.energy}, focus ${track.mood.focus}, chill ${track.mood.chill}, joy ${track.mood.joy}</p>
      <button type="button" class="fav-btn" data-favorite-id="${track.id}">Remove Favorite</button>
    `;
    favoritesEl.append(item);
  }
}

refreshBtn.addEventListener("click", render);
discoveryCheckbox.addEventListener("change", render);
orderSelect.addEventListener("change", render);
diversitySlider.addEventListener("input", render);

savePresetBtn.addEventListener("click", () => {
  const name = String(presetNameInput.value || "").trim();
  if (!name) {
    profileEl.textContent = "Enter a preset name before saving.";
    return;
  }
  profiles[name] = profileFromUi();
  saveProfiles(profiles);
  renderPresetOptions();
  presetSelect.value = name;
  presetNameInput.value = "";
  render();
});

presetSelect.addEventListener("change", () => {
  const name = presetSelect.value;
  if (!name || !profiles[name]) return;
  applyProfile(profiles[name]);
  render();
});

Object.values(sliders).forEach((slider) => {
  slider.addEventListener("input", render);
});

function handleTrackAction(event) {
  const button = event.target.closest("button[data-preview]");
  if (button) {
    playPreview(button.dataset.preview);
    return;
  }

  const favoriteButton = event.target.closest("button[data-favorite-id]");
  if (!favoriteButton) return;
  const trackId = favoriteButton.dataset.favoriteId;
  if (!trackId) return;

  if (favorites.has(trackId)) {
    favorites.delete(trackId);
  } else {
    favorites.add(trackId);
  }
  saveFavorites(Array.from(favorites));
  render();
}

playlistEl.addEventListener("click", handleTrackAction);
favoritesEl.addEventListener("click", handleTrackAction);

renderPresetOptions();
render();
