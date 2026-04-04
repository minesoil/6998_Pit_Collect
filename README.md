# Unipards 2026 Pit Scouting App

A mobile-first pit scouting tool for FRC Team 6998 — Unipards.

## File Structure

```
pit_collect_2026/
├── index.html          # Main app shell (HTML only, no inline JS/CSS)
├── field_2026.png      # Field map image for auto path drawing
├── css/
│   └── style.css       # All styles and theme variables
└── js/
    ├── tba.js          # The Blue Alliance API — events, teams, robot images
    ├── canvas.js       # Auto path drawing logic
    ├── qr.js           # QR code generation (data QR + path QR)
    └── form.js         # Navigation, validation, UI logic (loads last)
```

## Script Load Order

The scripts must load in this order (already set in `index.html`):

1. **tba.js** — defines `TEAM_LIST`, `EVENT_KEY`, `TEAM_IMAGES`, image fetch functions
2. **canvas.js** — defines `strokes`, `currentStroke`, drawing functions
3. **qr.js** — uses `strokes` and `TEAM_LIST` from above
4. **form.js** — wires everything together, runs navigation and validation

## Robot Image Logic

- Only fetches from **2026 and 2025** TBA media endpoints
- Tests each candidate URL with a real `Image()` load before caching
- **Never caches failures** — so every retry is fresh
- If a cached URL goes stale, it auto-heals and re-fetches
- If no image is found in 2025/2026, shows "No robot image found on TBA (2025/2026)"

## Setup

1. Clone the repo
2. Add your `field_2026.png` to the root folder
3. Open `index.html` in a browser (or serve with any static server)

> Note: The TBA API key is embedded in `js/tba.js`. Replace it with your own from [thebluealliance.com](https://www.thebluealliance.com/account).
