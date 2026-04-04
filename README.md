# Unipards 2026 Pit Scouting App

A mobile pit collect tool for FRC Team 6998.

## File Structure

```
pit_collect_2026/
├── index.html          # Main app shell (HTML only, no JS/CSS)
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

1. **tba.js**  defines `TEAM_LIST`, `EVENT_KEY`, `TEAM_IMAGES`, image fetch functions
2. **canvas.js**  defines `strokes`, `currentStroke`, drawing functions
3. **qr.js**  uses `strokes` and `TEAM_LIST` from above
4. **form.js**  wires everything together, runs navigation and validation

## Robot Image Logic

- Only fetches from **2026 and 2025** TBA media endpoints
- Tests each candidate URL with a real `Image()` load before caching
- **Never caches failures** — so every retry is fresh
- If a cached URL goes stale, it auto-heals and re-fetches
- If no image is found in 2025/2026, shows "No robot image found on TBA (2025/2026)"

## Auto Path Drawing

- **Line mode** — draw a freehand path across the field map; generates one QR per stroke
- **Dot mode** — tap anywhere on the map to place a position marker; each dot generates its own QR code
- Labels on generated QRs: paths show as "Auto Path #N", dots show as "Position Dot"
- Undo removes the last stroke or dot
- Clear resets the entire canvas and all path QRs

## Known Issues / Notes

- Template literal strings must use backticks (`` ` ``). If you export/copy JS files through certain editors, backticks can get stripped — this breaks all TBA API calls and QR generation silently
- CSS custom properties use double hyphens (`--accent`, `--text-main`). An en-dash (`–`) will not work
