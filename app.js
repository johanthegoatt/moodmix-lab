import { buildPlaylistAdvanced, localCatalog, normalizeProfile } from "./src/recommender.js";
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
const energyRampCheckbox = document.getElementById("energy-ramp");
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

function playPreview(hz) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = hz;
  gain.gain.value = 0.001;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  oscillator.stop(audioCtx.currentTime + 0.36);
}

function render() {
  const profile = profileFromUi();
  const playlist = buildPlaylistAdvanced(profile, localCatalog, 5, {
    discovery: discoveryCheckbox.checked,
    energyRamp: energyRampCheckbox.checked,
    diversityWeight: Number(diversitySlider.value || 50)
  });
  const mode = discoveryCheckbox.checked ? "discovery" : "precision";
  const rampMode = energyRampCheckbox.checked ? "energy-ramp on" : "energy-ramp off";
  const diversityWeight = Number(diversitySlider.value || 50);
  diversityValueEl.textContent = String(diversityWeight);

  profileEl.textContent = `Mode ${mode} (${rampMode}, diversity ${diversityWeight}) => energy ${profile.energy}, focus ${profile.focus}, chill ${profile.chill}, joy ${profile.joy}`;
  playlistEl.innerHTML = "";

  for (const track of playlist) {
    const favoriteLabel = favorites.has(track.id) ? "Unfavorite" : "Favorite";
    const item = document.createElement("li");
    item.className = "track";
    item.innerHTML = `
      <h3>${track.title} - ${track.artist}</h3>
      <p>Match score: ${track.score} | Serendipity: ${track.serendipity}</p>
      <button type="button" data-preview="${track.previewHz}">Play Preview Tone</button>
      <button type="button" class="fav-btn" data-favorite-id="${track.id}">${favoriteLabel}</button>
    `;
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
energyRampCheckbox.addEventListener("change", render);
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
    playPreview(Number(button.dataset.preview));
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
