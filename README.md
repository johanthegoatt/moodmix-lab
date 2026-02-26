# MoodMix Lab

## Description
MoodMix Lab is a local web project that builds playlists from mood sliders and provides quick generated tone previews per track.

## Features
- Mood profile controls for energy, focus, chill, and joy
- Local track catalog with vectorized mood signatures
- Weighted matching and sorted playlist output
- Instant playlist refresh on slider movement
- Discovery mode to increase artist diversity in recommendations
- Persistent saved profile presets
- Favorite tracks collection stored locally
- Lightweight browser audio preview tones (no external APIs)

## Run
```bash
cd moodmix-lab
npm run dev
```
Open `http://127.0.0.1:8092/moodmix-lab/index.html`.

## Test
```bash
cd moodmix-lab
npm test
```

## Project Structure
```text
moodmix-lab/
  index.html
  styles.css
  app.js
  src/
    recommender.js
    store.js
  tests/
    recommender.test.js
  package.json
  README.md
```
