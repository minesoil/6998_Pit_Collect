/* =========================================
   tba.js — The Blue Alliance API Integration
   Handles: events, team lists, robot images,
            manual roster, storage guard
========================================= */

const TBA_API_KEY = "86liJtIJ8jdGYlNIhrV8fAI1QjA3xY5fCy4friXBmvCdJLFy9vvZiHBnZaf0Op7v";

// ── State ──────────────────────────────────────────────────────────────────
let EVENT_KEY   = localStorage.getItem('TBA_LAST_EVENT') || "2026cmptx";
let EVENTS_DATA = {};
let TEAM_LIST   = {};

let TEAM_IMAGES = JSON.parse(localStorage.getItem('TBA_IMAGES_2026_V5') || '{}');

let tbaStatus = "loading";
let imageFetchTimeout           = null;
let currentImageFetchController = null;

// ── Manual Roster ──────────────────────────────────────────────────────────
const MANUAL_ROSTER_KEY = 'MANUAL_ROSTER_2026_V1';

function getManualRoster() {
    try { return JSON.parse(localStorage.getItem(MANUAL_ROSTER_KEY) || '{}'); } catch(e) { return {}; }
}

function mergeManualRoster() {
    const manual = getManualRoster();
    Object.assign(TEAM_LIST, manual);
}

function addManualTeam() {
    const num  = document.getElementById('manualTeamNum').value.trim();
    const name = document.getElementById('manualTeamName').value.trim();
    if (!num || !name) { alert('Please enter both a team number and nickname.'); return; }

    const roster = getManualRoster();
    roster[num] = { name, location: 'Manual Entry', manual: true };
    safeLocalStorageSet(MANUAL_ROSTER_KEY, JSON.stringify(roster));

    // Immediately merge into live TEAM_LIST
    TEAM_LIST[num] = roster[num];

    document.getElementById('manualTeamNum').value  = '';
    document.getElementById('manualTeamName').value = '';
    renderManualRosterList();
    updateStorageBar();

    // Re-trigger team input in case user just entered this number
    document.getElementById('teamNum').dispatchEvent(new Event('input'));
}

function removeManualTeam(num) {
    const roster = getManualRoster();
    delete roster[num];
    safeLocalStorageSet(MANUAL_ROSTER_KEY, JSON.stringify(roster));
    // Remove from live list only if it was manual (don't remove TBA entries)
    if (TEAM_LIST[num]?.manual) delete TEAM_LIST[num];
    renderManualRosterList();
    document.getElementById('teamNum').dispatchEvent(new Event('input'));
}

function renderManualRosterList() {
    const container = document.getElementById('manualRosterList');
    if (!container) return;
    const roster = getManualRoster();
    const entries = Object.entries(roster);
    if (entries.length === 0) {
        container.innerHTML = `<div style="color:var(--text-secondary);font-size:0.8rem;text-align:center;padding:8px;">No manual teams added.</div>`;
        return;
    }
    container.innerHTML = entries.map(([num, t]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;">
            <span style="color:var(--accent);font-weight:700;min-width:50px;">${num}</span>
            <span style="flex:1;color:var(--text-main);font-size:0.85rem;">${t.name}</span>
            <button type="button" onclick="removeManualTeam('${num}')"
                style="background:var(--danger);color:white;border:none;border-radius:6px;padding:3px 8px;font-size:0.75rem;cursor:pointer;">✕</button>
        </div>
    `).join('');
}

// ── Storage Guard ──────────────────────────────────────────────────────────
function getStorageUsageKB() {
    let total = 0;
    for (const key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue;
        total += (localStorage[key].length + key.length) * 2; // UTF-16
    }
    return Math.round(total / 1024);
}

function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch(e) {
        console.warn('localStorage full:', e);
        alert('⚠️ Storage is nearly full! Export your CSV data now, then clear old entries in Settings.');
        return false;
    }
}

function updateStorageBar() {
    const bar = document.getElementById('storageBar');
    if (!bar) return;
    const used    = getStorageUsageKB();
    const maxKB   = 5120; // 5MB estimate
    const pct     = Math.min(100, Math.round(used / maxKB * 100));
    const color   = pct > 80 ? 'var(--danger)' : pct > 60 ? '#ffbb33' : 'var(--success)';
    bar.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-secondary);margin-bottom:5px;">
            <span>Used: ~${used} KB</span><span>${pct}% of ~5 MB</span>
        </div>
        <div style="background:#222;border-radius:6px;height:10px;overflow:hidden;">
            <div style="width:${pct}%;background:${color};height:100%;border-radius:6px;transition:width 0.3s;"></div>
        </div>
        ${pct > 80 ? '<div style="color:var(--danger);font-size:0.75rem;margin-top:6px;">⚠️ Storage nearly full — export CSV and clear data soon.</div>' : ''}
    `;
}

// ── Robot Counter (persisted) ──────────────────────────────────────────────
function getRobotCount() { return parseInt(localStorage.getItem('ROBOT_COUNT') || '0'); }
function setRobotCount(n) {
    localStorage.setItem('ROBOT_COUNT', n);
    document.getElementById('robotCounter').innerText = `ROBOTS: ${n}`;
}
function incrementRobotCount() { setRobotCount(getRobotCount() + 1); }
function initRobotCounter()    { document.getElementById('robotCounter').innerText = `ROBOTS: ${getRobotCount()}`; }

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
    const disp   = document.getElementById('eventStatusDisplay');
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
            safeLocalStorageSet('TBA_EVENTS_2026_V1', JSON.stringify(EVENTS_DATA));
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
        disp.textContent        = `✓ Selected: ${EVENTS_DATA[EVENT_KEY].name} (${EVENT_KEY})`;
        disp.style.color        = "#000";
        disp.style.background   = "var(--accent)";
        disp.style.borderRadius = "8px";
    } else {
        disp.textContent      = `Selected: ${EVENT_KEY}`;
        disp.style.color      = "var(--text-main)";
        disp.style.background = "rgba(255,255,255,0.05)";
    }
}

function selectEvent(key) {
    if (key === EVENT_KEY) return;
    const teamNum = document.getElementById('teamNum').value.trim();
    if (teamNum) {
        if (!confirm(`Switching events will clear the current team entry. Continue?`)) return;
    }
    EVENT_KEY = key;
    safeLocalStorageSet('TBA_LAST_EVENT', EVENT_KEY);
    updateEventStatusDisplay();
    TEAM_LIST = {};
    document.getElementById('teamNameDisplay').innerHTML   = "Switching events...";
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
            safeLocalStorageSet(cacheKey, JSON.stringify(TEAM_LIST));
            tbaStatus = "loaded";
        } else {
            tbaStatus = "empty";
        }
    } catch (err) {
        console.warn("TBA Fetch failed:", err);
        if (Object.keys(TEAM_LIST).length === 0) tbaStatus = "error";
    } finally {
        // Always merge manual roster on top of TBA list
        mergeManualRoster();
        document.getElementById('teamNum').dispatchEvent(new Event('input'));
    }
}

// ── Robot Image ────────────────────────────────────────────────────────────
function resetImageUI() {
    const imgEl     = document.getElementById('robotImage');
    const container = document.getElementById('robotImageContainer');
    const statusEl  = document.getElementById('imageStatus');
    const spinnerEl = document.getElementById('imageLoadingSpinner');
    imgEl.src               = '';
    imgEl.style.display     = 'none';
    container.style.display = 'none';
    statusEl.style.display  = 'none';
    spinnerEl.style.display = 'none';
}

async function fetchRobotImage(teamNum) {
    const imgEl     = document.getElementById('robotImage');
    const container = document.getElementById('robotImageContainer');
    const statusEl  = document.getElementById('imageStatus');
    const spinnerEl = document.getElementById('imageLoadingSpinner');

    resetImageUI();
    if (currentImageFetchController) currentImageFetchController.abort();
    currentImageFetchController = new AbortController();
    const signal = currentImageFetchController.signal;

    const cached = TEAM_IMAGES[teamNum];
    if (cached) { tryLoadImage(imgEl, container, statusEl, cached, teamNum); return; }

    spinnerEl.style.display = 'block';

    try {
        const [media2026, media2025] = await Promise.all([
            fetch(`https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2026`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY }, signal })
                .then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2025`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY }, signal })
                .then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        spinnerEl.style.display = 'none';
        if (signal.aborted) return;
        const candidateUrls = extractImageUrls(media2026).concat(extractImageUrls(media2025));
        if (candidateUrls.length === 0) { statusEl.style.display = 'block'; return; }
        tryNextCandidate(imgEl, container, statusEl, candidateUrls, 0, teamNum);
    } catch (err) {
        spinnerEl.style.display = 'none';
        if (err.name !== 'AbortError') { statusEl.style.display = 'block'; }
    }
}

function extractImageUrls(mediaArr) {
    if (!Array.isArray(mediaArr)) return [];
    const urls = [];
    for (const item of mediaArr) {
        if (item.type === 'imgur') {
            if (item.view_url)   urls.push(item.view_url);
            if (item.direct_url) urls.push(item.direct_url);
        }
        if (item.direct_url && /\.(jpe?g|png|gif|webp)/i.test(item.direct_url))
            if (!urls.includes(item.direct_url)) urls.push(item.direct_url);
    }
    return urls;
}

function tryNextCandidate(imgEl, container, statusEl, urls, index, teamNum) {
    if (index >= urls.length) { statusEl.style.display = 'block'; return; }
    const url = urls[index], testImg = new Image();
    testImg.onload = function() {
        TEAM_IMAGES[teamNum] = url;
        safeLocalStorageSet('TBA_IMAGES_2026_V5', JSON.stringify(TEAM_IMAGES));
        imgEl.src = url; imgEl.style.display = 'block';
        container.style.display = 'block'; statusEl.style.display = 'none';
    };
    testImg.onerror = () => tryNextCandidate(imgEl, container, statusEl, urls, index + 1, teamNum);
    testImg.src = url;
}

function tryLoadImage(imgEl, container, statusEl, url, teamNum) {
    const testImg = new Image();
    testImg.onload = function() {
        imgEl.src = url; imgEl.style.display = 'block';
        container.style.display = 'block'; statusEl.style.display = 'none';
    };
    testImg.onerror = function() {
        delete TEAM_IMAGES[teamNum];
        safeLocalStorageSet('TBA_IMAGES_2026_V5', JSON.stringify(TEAM_IMAGES));
        fetchRobotImage(teamNum);
    };
    testImg.src = url;
}

// ── Startup ────────────────────────────────────────────────────────────────
fetchEvents();
initTBA();
initRobotCounter();
