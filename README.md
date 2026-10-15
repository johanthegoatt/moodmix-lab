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
- Mood previews: a short arpeggio per track, major or minor from joy, faster with energy, softer when chill (Gabrielsson & Lindström 2010)
- Order the picks best match first, as an energy ramp (calm to lively), or as a smooth flow: the order with the least total mood change across all four moods, found by nearest neighbour plus 2-opt
- Add your own songs: title and artist, tagged with the current slider mood, saved in the browser and mixed into recommendations

## Run
```bash
cd moodmix-lab
npm run dev
```
Open the URL `npm run dev` prints.

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
