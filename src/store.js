const PROFILE_KEY = "moodmix:profiles:v1";
const FAVORITE_KEY = "moodmix:favorites:v1";

export function loadProfiles(storage = localStorage) {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProfiles(profiles, storage = localStorage) {
  storage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

export function loadFavorites(storage = localStorage) {
  try {
    const raw = storage.getItem(FAVORITE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites, storage = localStorage) {
  storage.setItem(FAVORITE_KEY, JSON.stringify(favorites));
}


const LIBRARY_KEY = "moodmix:library:v1";

export function loadLibrary(storage = localStorage) {
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(tracks, storage = localStorage) {
  storage.setItem(LIBRARY_KEY, JSON.stringify(tracks));
}
