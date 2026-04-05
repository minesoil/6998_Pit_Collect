# 🤖 Unipards 2026 Pit Scouting App
### FRC Team 6998 — Mobile Pit Collection Tool

---

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Script Architecture](#script-architecture)
4. [Feature Deep-Dive](#feature-deep-dive)
5. [TBA Integration](#tba-integration)
6. [Data Flow & Storage](#data-flow--storage)
7. [QR Code System](#qr-code-system)
8. [Auto Path Drawing](#auto-path-drawing)
9. [Settings & Assignments](#settings--assignments)
10. [Known Issues & Notes](#known-issues--notes)
11. [User Guide (English)](#user-guide-english)
12. [使用指南 (中文)](#使用指南-中文)

---

## Overview

Unipards Pit Collect is a fully offline-capable, mobile-first web app for collecting robot specifications at FRC competition pit areas. It integrates with The Blue Alliance (TBA) API to auto-populate team rosters and robot images, generates compressed QR codes for fast data transfer, and stores all scouted data locally on the device.

The app is designed to run on iPads and phones in a pit environment where connectivity may be unreliable. All scouted data is saved to `localStorage` and can be exported as a CSV at any time.

---

## File Structure

```
pit_collect_2026/
├── index.html              # App shell — all HTML, modals, form pages
├── field_2026.png          # FRC 2026 field map image for auto path drawing
├── css/
│   └── style.css           # All styles, theme variables, responsive rules
└── js/
    ├── tba.js              # The Blue Alliance API — events, teams, images, storage
    ├── canvas.js           # Auto path drawing — touch/mouse, strokes, QR export
    ├── qr.js               # QR generation, scouted list, CSV export, edit/prefill
    └── form.js             # Navigation, validation, UI logic — loads last
```

---

## Script Architecture

Scripts must load in this exact order (set in `index.html`):

```html
<script src="js/tba.js" defer></script>
<script src="js/canvas.js" defer></script>
<script src="js/qr.js" defer></script>
<script src="js/form.js" defer></script>
```

The `defer` attribute ensures all four scripts load after the DOM is fully parsed, preventing `onclick` handlers from firing before functions are registered.

### Why this order matters

| Script | Defines | Used by |
|--------|---------|---------|
| `tba.js` | `TEAM_LIST`, `EVENT_KEY`, `TEAM_IMAGES`, `tbaStatus`, all TBA fetch functions | `form.js`, `qr.js` |
| `canvas.js` | `strokes`, `currentStroke`, drawing functions, `initCanvas()` | `form.js`, `qr.js` |
| `qr.js` | `generateQR()`, `getScoutedTeams()`, `renderScoutedList()`, `exportCSV()` | `form.js` |
| `form.js` | Navigation, validation, `openSettings()`, `updateNavButtons()` | Everything |

---

## Feature Deep-Dive

### Step 1 — Identification
- **Event Selection**: Searches all 2026 FRC events from TBA. Displays event name, key, type, week, location, dates, and webcast link. Selecting a new event clears the current team and re-fetches the team roster.
- **Scouter Name**: Dropdown of 5 scouter pairs. Selecting a name shows that pair's assigned teams (if set in Settings).
- **Team Number**: Validates against TBA roster. Shows team name, location, robot image, and a TBA profile panel (founded year, career awards, school, 2026 events). Warns if the team has already been scouted.

### Step 2 — Robot Specifications
- **Chassis**: Swerve, Tank, Mecanum, or Other.
- **Weight**: Accepts lbs or kg, converts to lbs for validation. Max is 135 lbs (61.2 kg).
- **Max Fuel Capacity**: The maximum number of game pieces the robot can hold at once.

### Step 3 — Systems
- **Intake**: Multi-select. Over Bumper, Under Bumper, Roller, Other (free text).
- **Vision Hardware**: Limelight, Normal Camera, Other (free text).
- **Vision Capabilities**: Object Detection, AprilTag, Other (free text).
- **Shooting**: Stationary, Move & Shoot, Intake & Shoot, Passing.
- **Turrets**:
  - **Single / Double**: Shows "Can Change Degree?" → if Yes, shows Yaw (left/right) and Pitch (up/down) DOF inputs.
  - **Wide Shooter**: Shows "Can Change Degree?" → if Yes, shows Pitch DOF only (Yaw is hidden — wide shooters cannot rotate left/right).

### Step 4 — Autonomous
- **Starting Location**: Left, Center, Right (multi-select).
- **Preload Count**: 0–8, cannot exceed Max Capacity from Step 2.
- **Auto Intake Source**: Ground, Outpost, Depot.
- **Auto Hang Location**: Left, Center, Right, Far Left Side, Far Right Side.
- **Total Auto Fuel**: Total game pieces scored during auto (max 499).
- **Cross Midfield**: Checkbox.
- **Terrain**: Bump, Trench.

### Step 5 — Teleop & Endgame
- **Climb Capability**: L1, L2, L3 (multi-select). Selecting any level reveals the Climb Time field.
- **Climb Position**: Left, Center, Right, Far Left Side, Far Right Side.
- **Climb Time**: Estimated seconds to complete the climb.
- **Photos Taken**: Checkbox confirming robot photos were captured.
- **General Notes**: Free text, max 300 characters. Profanity filter active.

### Step 6 — Review & Sync
- Displays a full summary of all entered data before generating the QR code.
- **Generate Data QR**: Compresses all form data using LZ-String and encodes it as a QR code for scanning by the data collection system.
- **Teams Not Yet Scouted**: Chips for every team in the event roster that hasn't been scouted yet. Tap any chip to jump directly to that team.
- **Teams Scouted This Event**: Full list with quick-view (👁) and edit (✏️) buttons. Export CSV available.

### Step 7 — Auto Path Drawing
- Draw the robot's autonomous path on the 2026 field map.
- **Line Mode**: Freehand path drawing. Each lift of the finger/mouse creates a new numbered stroke.
- **Dot Mode**: Tap to place a single position marker.
- Each stroke or dot generates its own separate QR code labeled "Auto Path #N" or "Position Dot".
- Undo removes the last stroke. Clear resets everything.

---

## TBA Integration

### API Key
Stored as a constant in `tba.js`:
```js
const TBA_API_KEY = "your_key_here";
```
Get or regenerate your key at [thebluealliance.com/account](https://www.thebluealliance.com/account).

### What gets fetched
| Endpoint | Used for |
|----------|----------|
| `/events/2026/simple` | Event search dropdown |
| `/event/{key}` | Full event detail (dates, webcasts, divisions) |
| `/event/{key}/teams/simple` | Team roster for validation |
| `/event/{key}/division_keys` | Fallback for championship events with sub-divisions |
| `/team/frc{num}` | Team profile panel (school, rookie year) |
| `/team/frc{num}/awards` | Career award count |
| `/team/frc{num}/events/2026/simple` | Team's 2026 schedule |
| `/team/frc{num}/media/2026` + `/media/2025` | Robot images |

### Caching
All TBA responses are cached in `localStorage` to support offline use:
- Events: `TBA_EVENTS_2026_V1`
- Team list: `TBA_TEAM_LIST_{eventKey}_V3`
- Robot images: `TBA_IMAGES_2026_V5`

### Robot Image Logic
1. Checks `TBA_IMAGES_2026_V5` cache first.
2. If not cached, fetches 2026 then 2025 media in parallel.
3. Tests each candidate URL with a real `Image()` load before caching.
4. Never caches failures — every retry is fresh.
5. If a cached URL goes stale, it auto-heals and re-fetches.
6. Shows "No robot image found on TBA (2025/2026)" if nothing loads.

### Manual Roster (TBA Fallback)
If TBA is offline, teams can be added manually in Settings. Manual entries merge with the TBA list and persist in `localStorage` under `MANUAL_ROSTER_2026_V1`.

---

## Data Flow & Storage

### localStorage Keys

| Key | Contents |
|-----|----------|
| `TBA_LAST_EVENT` | Last selected event key |
| `TBA_EVENTS_2026_V1` | All 2026 events (JSON) |
| `TBA_TEAM_LIST_{key}_V3` | Team roster for a specific event |
| `TBA_IMAGES_2026_V5` | Robot image URL cache |
| `MANUAL_ROSTER_2026_V1` | Manually added teams |
| `SCOUTED_TEAMS_2026_V1` | All scouted entries (JSON array) |
| `SCOUTER_ASSIGNMENTS_V2` | Scouter-to-team assignments |
| `ROBOT_COUNT` | Running count of scouted robots |

### Storage Guard
All writes go through `safeLocalStorageSet()` which catches quota errors and alerts the user to export CSV and clear data before continuing.

### Storage Usage Bar
Visible in Settings. Shows approximate KB used out of ~5 MB browser limit. Turns orange above 60%, red above 80%.

---

## QR Code System

### Data QR
All form fields are joined with tab characters (`\t`) into a TSV string, then compressed with LZ-String's `compressToBase64`. The result is encoded as a QR code at error correction level L (maximizes data density).

TSV field order:
```
version | teamNum | scouter | chassis | weight | capacity | intake |
visionHard | visionSoft | shoot | turret | startPos | preload |
autoIntake | autoHang | autoTotal | crossMid | terrain |
climbLvl | climbPos | climbTime | photos | notes
```

### Path QR
Each stroke is encoded as a series of `x,y` percentage coordinates separated by `|`. One QR code is generated per stroke or dot. Format:
```
version | eventCode | 0 | teamNum | x1,y1|x2,y2|...
```

### Version Header
All QR payloads begin with `v2` so the receiving system can detect the schema version.

---

## Auto Path Drawing

- Canvas is sized to fill its container and redraws on window resize.
- All coordinates are stored as percentages of canvas dimensions (not pixels), so paths are resolution-independent.
- Each stroke is colored from a rotating palette: green, blue, red, yellow, purple.
- Start point shown as green dot, end point as red dot.
- Stroke number label shown near the start point.
- Touch events use `{ passive: false }` to allow `preventDefault()` and block page scroll while drawing.

---

## Settings & Assignments

### Scouter Assignments
Assign specific team numbers from the current event roster to each scouter pair. Assignments are shown as a hint banner on Step 1 when a scouter is selected. Individual teams can be removed by tapping their chip, or all teams for a scouter removed at once.

### Manual Team Roster
Add teams by number and nickname. These persist across sessions and merge with the TBA roster. Useful when TBA is offline or a team isn't listed yet.

---

## Known Issues & Notes

- **Backtick stripping**: Template literal strings use backticks (`` ` ``). Some editors or copy-paste workflows strip backticks, breaking all TBA API calls and QR generation silently. Always verify `.js` files on GitHub still contain backtick characters after editing.
- **CSS custom properties**: Use double hyphens (`--accent`). An en-dash (`–`) will not work and will silently fail.
- **`-1` object key**: In `formatEventType()`, the key `[-1]` must use bracket notation. Without brackets, `-1` is a syntax error in strict JS parsers.
- **`defer` on scripts**: All four scripts must use `defer` in `index.html`. Without it, `onclick` handlers in HTML may fire before the JS functions are registered, especially on slower devices.
- **GitHub Pages cache**: After pushing changes, wait ~60 seconds for Pages to rebuild. On iPad, close Safari fully and reopen to clear the cache.
- **`2026cmptx` empty roster**: Championship events may have no teams registered on TBA until closer to the event. Use the event search to switch to a regional or district event with a known roster.
- **`degreeOptionsBox` class**: This div must NOT have the `conditional-input` CSS class. That class sets `display:none` which overrides the inline style set by `toggleDegreeOptions()`.

---

## User Guide (English)

### Before You Start
1. Make sure you have a stable internet connection for the first load — TBA data is cached after that.
2. Open the app and wait for the event status display to show your event name in gold.
3. If it says "Loading events..." for more than 10 seconds, check your connection or use the Settings to add teams manually.

### Scouting a Robot — Step by Step

**Step 1: Identification**
1. Tap the event search bar and type your event name, city, or event key (e.g. `2025cmptx`). Tap the result to select it.
2. Select your scouter pair name from the dropdown.
3. Enter the team number you are scouting. The team name and location will appear automatically. A robot photo will load if available on TBA.
4. If the team shows "Not in TBA Official List", double-check the team number. If correct, you can add the team manually in Settings.
5. Tap **Next**.

**Step 2 & 3: Robot & Systems**
1. Select the chassis type.
2. Enter the robot weight. Toggle lbs/kg as needed.
3. Enter the max fuel capacity (how many game pieces the robot can hold).
4. Select all applicable intake types. If you choose "Other", a text box will appear — fill it in.
5. Select vision hardware and capabilities. Fill in "Other" if needed.
6. Select shooting capabilities.
7. Select the turret type:
   - **Single or Double**: A "Can Change Degree?" prompt appears. If Yes, select Yaw and/or Pitch and enter the degree range for each.
   - **Wide Shooter**: A "Can Change Degree?" prompt appears. If Yes, only Pitch is available — enter the pitch range.
8. Tap **Next**.

**Step 4: Autonomous**
1. Select all starting positions the robot uses.
2. Enter the preload count (must not exceed max capacity).
3. Select auto intake sources.
4. Select auto hang locations.
5. Enter the total game pieces scored during auto.
6. Check "Cross Midfield" if the robot crosses the center line.
7. Select terrain types the robot navigates.
8. Tap **Next**.

**Step 5: Teleop & Endgame**
1. Select all climb levels the robot can achieve. A "Climb Time" field will appear — enter estimated seconds.
2. Select climb positions.
3. Check "Photos Taken" to confirm you have photographed the robot.
4. Add any notes about driver skill, defense, reliability, or anything unusual. Max 300 characters.
5. Tap **Next**.

**Step 6: Review & Sync**
1. Review the full summary. Make sure everything looks correct.
2. Tap **Generate Data QR** — a QR code will appear. Have the data collector scan it.
3. After scanning, tap **Next: Draw Auto Path →** to proceed to path drawing.
4. If you need to fix anything, tap **✏️ Edit** next to the team in the scouted list, or use the back button.

**Step 7: Auto Path**
1. Use **Line mode** to draw the robot's autonomous route by dragging your finger across the field map. Lift and drag again for a second path.
2. Use **Dot mode** to place a single position marker if the robot has no auto.
3. Tap **Generate Path QRs** — one QR code appears per stroke/dot. Have the collector scan each one.
4. Tap **Finish & Reset** to clear the form and start the next robot.

### Exporting Data
- On **Step 6**, tap **⬇ Export CSV** to download all scouted data as a spreadsheet.
- Do this regularly to back up data, especially when the storage bar turns orange.

### If TBA Won't Load
1. Open **Settings** (⚙️ in the header).
2. Scroll to **Manual Team Roster**.
3. Enter the team number and nickname, then tap **+ Add Team**.
4. The team will appear in the roster immediately.

### Checking Who Still Needs to be Scouted
- On **Step 6**, the **"Teams Not Yet Scouted"** section shows every team in the event that has not been scouted yet.
- Tap any team number chip to jump directly to scouting that team.

---

## 使用指南 (中文)

### 開始之前
1. 第一次使用時請確保有網路連線——TBA 資料載入後會自動儲存在裝置上，之後可離線使用。
2. 開啟 App，等待頂部事件欄位顯示金色的賽事名稱。
3. 若超過 10 秒仍顯示「Loading events...」，請檢查網路，或在設定中手動新增隊伍。

### 填寫步驟說明

**步驟一：基本資料**
1. 點擊賽事搜尋欄，輸入賽事名稱、城市或賽事代碼（例如 `2025cmptx`），點選搜尋結果選擇賽事。
2. 從下拉選單選擇你的記錄員名稱。
3. 輸入你正在記錄的隊伍編號，隊名和所在地會自動顯示，若 TBA 有機器人照片也會自動載入。
4. 若顯示「Not in TBA Official List」，請再次確認隊伍編號。若確認無誤，可在設定中手動新增該隊伍。
5. 點擊**下一步**。

**步驟二＆三：機器人與系統**
1. 選擇底盤類型。
2. 輸入機器人重量，可切換磅（lbs）或公斤（kg）。
3. 輸入最大容量（機器人最多可攜帶的遊戲元件數量）。
4. 選擇所有適用的 Intake 類型。選擇「Other（其他）」時，會出現文字欄位，請填入說明。
5. 選擇視覺硬體與功能，如有「Other」請填入說明。
6. 選擇射球能力。
7. 選擇砲台類型：
   - **單旋轉／雙旋轉砲台**：出現「可調仰角？」，選擇「可以」後，勾選偏轉（Yaw）和／或俯仰（Pitch）並輸入各自的角度範圍。
   - **寬炮台**：出現「可調仰角？」，選擇「可以」後，只有俯仰（Pitch）可填——輸入俯仰角度範圍。
8. 點擊**下一步**。

**步驟四：自動期**
1. 選擇機器人使用的所有起始位置。
2. 輸入 Preload 數量（不得超過最大容量）。
3. 選擇自動期吸球來源。
4. 選擇自動期掛靠位置。
5. 輸入自動期總共得分的遊戲元件數量。
6. 若機器人會穿越中場，勾選「Cross Midfield」。
7. 選擇機器人能通過的地形類型。
8. 點擊**下一步**。

**步驟五：遙控期與終局**
1. 選擇機器人能達到的所有吊掛等級，選擇後會出現「Climb Time」欄位——輸入預估秒數。
2. 選擇吊掛位置。
3. 確認已拍攝機器人照片後，勾選「Photos Taken」。
4. 在備註欄填寫關於操縱手技術、防守策略、穩定性或任何特殊事項的說明，最多 300 字。
5. 點擊**下一步**。

**步驟六：確認與同步**
1. 確認所有資料摘要無誤。
2. 點擊 **Generate Data QR**，產生 QR Code 後，請資料收集人員掃描。
3. 掃描完成後，點擊 **Next: Draw Auto Path →** 進入路徑繪製。
4. 若需修改，可點擊已記錄列表中隊伍旁的 **✏️ 編輯**，或使用返回按鈕。

**步驟七：自動路徑繪製**
1. 使用**線條模式（Line Mode）**，用手指在場地圖上拖曳繪製機器人的自動路徑；抬起手指再拖曳可繪製第二條路徑。
2. 若機器人沒有自動期，使用**點位模式（Dot Mode）**在對應位置點一下即可。
3. 點擊 **Generate Path QRs**，每條路徑或點位各產生一個 QR Code，請資料收集人員逐一掃描。
4. 點擊 **Finish & Reset** 清除表單，開始記錄下一台機器人。

### 匯出資料
- 在**步驟六**，點擊 **⬇ Export CSV** 即可將所有已記錄資料下載為試算表檔案。
- 建議定期匯出備份，尤其是儲存量顯示橘色警告時。

### TBA 無法載入時
1. 點擊右上角的設定按鈕（⚙️）。
2. 找到**Manual Team Roster（手動隊伍名單）**區塊。
3. 輸入隊伍編號與暱稱，點擊 **+ Add Team**。
4. 該隊伍將立即顯示在隊伍清單中。

### 確認哪些隊伍還未記錄
- 在**步驟六**，**「Teams Not Yet Scouted（尚未記錄的隊伍）」**區塊會顯示所有尚未被記錄的隊伍。
- 點擊任一隊伍編號即可直接跳至該隊伍的記錄表單。

---

*Unipards Pit Collect — FRC Team 6998 · Built for 2026 Season*
