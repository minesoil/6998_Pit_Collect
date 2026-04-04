/* =========================================
tba.js — The Blue Alliance API Integration
Handles: events, team lists, robot images
========================================= */

const TBA_API_KEY = "86liJtIJ8jdGYlNIhrV8fAI1QjA3xY5fCy4friXBmvCdJLFy9vvZiHBnZaf0Op7v";

// ── State ──────────────────────────────────────────────────────────────────
let EVENT_KEY   = localStorage.getItem('TBA_LAST_EVENT') || "2026cmptx";
let EVENTS_DATA = {};   // { "2026key": { name, city, … } }
let TEAM_LIST   = {};   // { "6998": { name, location } }

// Image cache — only stores confirmed working URLs, never "none"
let TEAM_IMAGES = JSON.parse(localStorage.getItem('TBA_IMAGES_2026_V5') || '{}');

let tbaStatus = "loading";
let imageFetchTimeout         = null;
let currentImageFetchController = null;

// ── Helpers ────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeoutMs);
try {
const response = await fetch(url, { ...options, signal: controller.signal });
clearTimeout(id);
return response;
} catch (err) {
clearTimeout(id);
throw err;
}
}

// ── Events ─────────────────────────────────────────────────────────────────
async function fetchEvents() {
const disp = document.getElementById('eventStatusDisplay');
const cached = localStorage.getItem('TBA_EVENTS_2026_V1');
if (cached) {
try { EVENTS_DATA = JSON.parse(cached); } catch(e) {}
updateEventStatusDisplay();
}

try {
    if (Object.keys(EVENTS_DATA).length === 0) disp.textContent = "Fetching Event List from TBA...";
    const res = await fetchWithTimeout(
        `https://www.thebluealliance.com/api/v3/events/2026/simple`,
        { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
    );
    if (res.ok) {
        const data = await res.json();
        EVENTS_DATA = {};
        data.forEach(e => { EVENTS_DATA[e.key] = e; });
        localStorage.setItem('TBA_EVENTS_2026_V1', JSON.stringify(EVENTS_DATA));
        updateEventStatusDisplay();
    }
} catch (err) {
    console.warn("Could not fetch events:", err);
    if (Object.keys(EVENTS_DATA).length === 0) {
        disp.textContent = "Offline Mode (Search disabled)";
        disp.style.color = "var(--text-secondary)";
    }
}

}

function updateEventStatusDisplay() {
const disp = document.getElementById('eventStatusDisplay');
if (EVENTS_DATA[EVENT_KEY]) {
disp.textContent = `✓ Selected: ${EVENTS_DATA[EVENT_KEY].name} (${EVENT_KEY})`;
disp.style.color      = "#000";
disp.style.background = "var(--accent)";
disp.style.borderRadius = "8px";
} else {
disp.textContent = `Selected: ${EVENT_KEY}`;
disp.style.color      = "var(--text-main)";
disp.style.background = "rgba(255,255,255,0.05)";
}
}

function selectEvent(key) {
if (key === EVENT_KEY) return;
EVENT_KEY = key;
localStorage.setItem('TBA_LAST_EVENT', EVENT_KEY);
updateEventStatusDisplay();

TEAM_LIST = {};
document.getElementById('teamNameDisplay').innerHTML = "Switching events...";
document.getElementById('teamNameDisplay').style.background = "rgba(255,255,255,0.05)";
resetImageUI();
initTBA();

}

// ── Teams ──────────────────────────────────────────────────────────────────
async function initTBA() {
tbaStatus = "loading";
const disp     = document.getElementById('teamNameDisplay');
const cacheKey = 'TBA_TEAM_LIST_' + EVENT_KEY + '_V3';
const cached   = localStorage.getItem(cacheKey);

if (cached) {
    try { TEAM_LIST = JSON.parse(cached); tbaStatus = "loaded"; } catch(e) { TEAM_LIST = {}; }
}

if (tbaStatus === "loading") {
    disp.textContent      = "Fetching TBA Teams...";
    disp.style.color      = "var(--accent)";
    disp.style.background = "rgba(255,255,255,0.05)";
}

try {
    let allTeams = [];
    const response = await fetchWithTimeout(
        `https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/teams/simple`,
        { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
    );
    if (!response.ok) throw new Error(`TBA API Error: ${response.status}`);
    const teams = await response.json();

    if (teams.length === 0) {
        // Championship event — fetch from divisions
        const eventRes = await fetchWithTimeout(
            `https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}`,
            { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
        );
        if (eventRes.ok) {
            const eventData = await eventRes.json();
            if (eventData.division_keys?.length > 0) {
                const divResults = await Promise.all(
                    eventData.division_keys.map(divKey =>
                        fetchWithTimeout(
                            `https://www.thebluealliance.com/api/v3/event/${divKey}/teams/simple`,
                            { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
                        ).then(r => r.ok ? r.json() : [])
                    )
                );
                divResults.forEach(div => { allTeams = allTeams.concat(div); });
            }
        }
    } else {
        allTeams = teams;
    }

    if (allTeams.length > 0) {
        TEAM_LIST = {};
        allTeams.forEach(t => {
            const loc = [t.city, t.state_prov, t.country].filter(x => x?.trim()).join(', ') || "Location Unknown";
            TEAM_LIST[t.team_number] = { name: t.nickname, location: loc };
        });
        localStorage.setItem(cacheKey, JSON.stringify(TEAM_LIST));
        tbaStatus = "loaded";
    } else {
        tbaStatus = "empty";
    }
} catch (err) {
    console.warn("TBA Fetch failed:", err);
    if (Object.keys(TEAM_LIST).length === 0) tbaStatus = "error";
} finally {
    document.getElementById('teamNum').dispatchEvent(new Event('input'));
}

}

// ── Robot Image ────────────────────────────────────────────────────────────
// Only checks 2026 and 2025. Never caches failures.
// Uses a waterfall of candidate URLs — the first one that actually loads wins.

function resetImageUI() {
const imgEl     = document.getElementById('robotImage');
const container = document.getElementById('robotImageContainer');
const statusEl  = document.getElementById('imageStatus');
const spinnerEl = document.getElementById('imageLoadingSpinner');
imgEl.src                  = '';
imgEl.style.display        = 'none';
container.style.display    = 'none';
statusEl.style.display     = 'none';
spinnerEl.style.display    = 'none';
}

async function fetchRobotImage(teamNum) {
const imgEl     = document.getElementById('robotImage');
const container = document.getElementById('robotImageContainer');
const statusEl  = document.getElementById('imageStatus');
const spinnerEl = document.getElementById('imageLoadingSpinner');

resetImageUI();

// Cancel any previous in-flight request
if (currentImageFetchController) currentImageFetchController.abort();
currentImageFetchController = new AbortController();
const signal = currentImageFetchController.signal;

// Use cache only if it's a confirmed real URL
const cached = TEAM_IMAGES[teamNum];
if (cached) {
    tryLoadImage(imgEl, container, statusEl, cached, teamNum);
    return;
}

spinnerEl.style.display = 'block';

try {
    // Fetch 2026 and 2025 media in parallel
    const [media2026, media2025] = await Promise.all([
        fetch(
            `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2026`,
            { headers: { 'X-TBA-Auth-Key': TBA_API_KEY }, signal }
        ).then(r => r.ok ? r.json() : []).catch(() => []),

        fetch(
            `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2025`,
            { headers: { 'X-TBA-Auth-Key': TBA_API_KEY }, signal }
        ).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    spinnerEl.style.display = 'none';
    if (signal.aborted) return;

    // Build candidate URL list — 2026 first, then 2025
    const candidateUrls = extractImageUrls(media2026).concat(extractImageUrls(media2025));

    if (candidateUrls.length === 0) {
        // No media found for either year — show "no image" immediately
        statusEl.style.display = 'block';
        return;
    }

    // Try each URL — first one that actually loads in the browser wins
    tryNextCandidate(imgEl, container, statusEl, candidateUrls, 0, teamNum);

} catch (err) {
    spinnerEl.style.display = 'none';
    if (err.name !== 'AbortError') {
        console.warn('Image fetch error for team', teamNum, err);
        statusEl.style.display = 'block';
    }
}

}

// Pull usable image URLs out of a TBA media array
function extractImageUrls(mediaArr) {
if (!Array.isArray(mediaArr)) return [];
const urls = [];
for (const item of mediaArr) {
// imgur: prefer view_url (TBA CDN-proxied, no hotlink block)
if (item.type === 'imgur') {
if (item.view_url)   urls.push(item.view_url);
if (item.direct_url) urls.push(item.direct_url);
}
// anything with a direct image file URL
if (item.direct_url && /\.(jpe?g|png|gif|webp)/i.test(item.direct_url)) {
if (!urls.includes(item.direct_url)) urls.push(item.direct_url);
}
}
return urls;
}

// Walk through candidates one at a time — only cache + show on first successful load
function tryNextCandidate(imgEl, container, statusEl, urls, index, teamNum) {
if (index >= urls.length) {
// All URLs failed — show status but DO NOT cache, so we retry fresh next time
statusEl.style.display = 'block';
return;
}

const url     = urls[index];
const testImg = new Image();

testImg.onload = function() {
    TEAM_IMAGES[teamNum] = url;
    localStorage.setItem('TBA_IMAGES_2026_V5', JSON.stringify(TEAM_IMAGES));
    imgEl.src              = url;
    imgEl.style.display    = 'block';
    container.style.display = 'block';
    statusEl.style.display  = 'none';
};

testImg.onerror = function() {
    // This URL failed — silently try the next
    tryNextCandidate(imgEl, container, statusEl, urls, index + 1, teamNum);
};

testImg.src = url;

}

// Load a previously cached URL — auto-heals if it has since gone stale
function tryLoadImage(imgEl, container, statusEl, url, teamNum) {
const testImg = new Image();

testImg.onload = function() {
    imgEl.src              = url;
    imgEl.style.display    = 'block';
    container.style.display = 'block';
    statusEl.style.display  = 'none';
};

testImg.onerror = function() {
    // Cached URL is now dead — remove it and fetch fresh
    delete TEAM_IMAGES[teamNum];
    localStorage.setItem('TBA_IMAGES_2026_V5', JSON.stringify(TEAM_IMAGES));
    fetchRobotImage(teamNum);
};

testImg.src = url;

}

// ── Startup ────────────────────────────────────────────────────────────────
fetchEvents();
initTBA();
