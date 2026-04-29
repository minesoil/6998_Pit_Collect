/* =========================================
   tba.js — The Blue Alliance API Integration
   Handles: events, team lists,
            manual roster, storage guard,
            robot images, scouter assignments
========================================= */

const TBA_API_KEY = "C5Jcj7IYgrD4YYv1FpWUq0zsc09a7i0cNQ4mqWhWLoQlXbfSp8SQAuYAxZn3DRqi";

// ── Scouter Assignments (hardcoded for 2026 season) ────────────────────────
const SCOUTER_ASSIGNMENTS = {
    "郭耘睿 林宥均":           [1741, 2429, 1155, 1156, 3478, 1880, 10619, 7520, 1058, 2883, 4674, 1538],
    "張俊彬 裴敬庭":           [10213, 2399, 1676, 6391, 6696, 5534, 6017, 8724, 5847, 11, 9545, 4028],
    "黃浩倫 林以澈":           [3538, 3339, 272, 4065, 316, 7632, 1323, 999, 3314, 303, 2472, 5813, 7712],
    "李忻叡 戴均翰 justin":    [9094, 1939, 8393, 2530, 6919, 340, 3656, 3880, 3100, 6106, 4188, 9175],
    "莊欣嬡 黃可愛 李苡安 吳衣絜": [10229, 6998, 10002, 5550, 972, 3990, 6941, 5557, 1629, 3646, 176, 11178],
    "李承峰 李昌佑":           [3008, 2073, 1325, 1727, 11141, 5937, 4678, 2338, 4189, 624, 469, 4414, 2718, 1720],
};

// ── State ──────────────────────────────────────────────────────────────────
let EVENT_KEY = localStorage.getItem('TBA_LAST_EVENT') || "2026dal";
let EVENTS_DATA = {};
let TEAM_LIST   = {};
let CURRENT_EVENT_DETAIL = null;

let tbaStatus = "loading";

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

    TEAM_LIST[num] = roster[num];

    document.getElementById('manualTeamNum').value  = '';
    document.getElementById('manualTeamName').value = '';
    renderManualRosterList();
    updateStorageBar();

    document.getElementById('teamNum').dispatchEvent(new Event('input'));
}

function removeManualTeam(num) {
    const roster = getManualRoster();
    delete roster[num];
    safeLocalStorageSet(MANUAL_ROSTER_KEY, JSON.stringify(roster));
    if (TEAM_LIST[num]?.manual) delete TEAM_LIST[num];
    renderManualRosterList();
    document.getElementById('teamNum').dispatchEvent(new Event('input'));
}

function renderManualRosterList() {
    const container = document.getElementById('manualRosterList');
    if (!container) return;
    const roster  = getManualRoster();
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
        total += (localStorage[key].length + key.length) * 2;
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
    const used  = getStorageUsageKB();
    const maxKB = 5120;
    const pct   = Math.min(100, Math.round(used / maxKB * 100));
    const color = pct > 80 ? 'var(--danger)' : pct > 60 ? '#ffbb33' : 'var(--success)';
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

/* ── Robot Images ───────────────────────────────────────────────────────────
const IMAGE_CACHE_KEY = 'TBA_IMAGES_2026_V5';

function getImageCache() {
    try { return JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}'); } catch(e) { return {}; }
}

async function testImageUrl(url) {
    return new Promise(resolve => {
        const img   = new Image();
        const timer = setTimeout(() => resolve(null), 5000);
        img.onload  = () => { clearTimeout(timer); resolve(url); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
    });
}

async function fetchRobotImage(teamNum) {
    const container = document.getElementById('robotImageContainer');
    const imgEl     = document.getElementById('robotImage');
    const statusEl  = document.getElementById('imageStatus');
    const spinner   = document.getElementById('imageLoadingSpinner');
    if (!container) return;

    container.style.display = 'block';
    spinner.style.display   = 'block';
    imgEl.style.display     = 'none';
    statusEl.style.display  = 'none';

    const show = (url) => {
        spinner.style.display  = 'none';
        imgEl.src              = url;
        imgEl.style.display    = 'block';
        statusEl.style.display = 'none';
    };
    const showNone = (msg) => {
        spinner.style.display  = 'none';
        imgEl.style.display    = 'none';
        statusEl.textContent   = msg;
        statusEl.style.display = 'block';
    };

    // Check cache first
    const cache = getImageCache();
    if (cache[teamNum]) {
        if (cache[teamNum] === 'none') { showNone('No robot image found on TBA (2025/2026)'); return; }
        const verified = await testImageUrl(cache[teamNum]);
        if (verified) { show(verified); return; }
        delete cache[teamNum]; // stale — re-fetch
    }

    try {
        const [r26, r25] = await Promise.all([
            fetchWithTimeout(
                `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2026`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
            ).catch(() => null),
            fetchWithTimeout(
                `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/media/2025`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
            ).catch(() => null),
        ]);

        const candidates = [];
        for (const r of [r26, r25]) {
            if (r?.ok) {
                const media = await r.json();
                media.filter(m => m.direct_url).forEach(m => candidates.push(m.direct_url));
            }
        }

        let found = null;
        for (const url of candidates) {
            const ok = await testImageUrl(url);
            if (ok) { found = ok; break; }
        }

        const newCache = getImageCache();
        newCache[teamNum] = found || 'none';
        safeLocalStorageSet(IMAGE_CACHE_KEY, JSON.stringify(newCache));

        if (found) show(found);
        else showNone('No robot image found on TBA (2025/2026)');

    } catch(e) {
        showNone('📡 Offline — robot image unavailable');
    }
}*/

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
            disp.textContent = "📡 Offline Mode (Event search disabled)";
            disp.style.color = "var(--text-secondary)";
        }
    }
}

async function fetchEventDetail(key) {
    CURRENT_EVENT_DETAIL = null;
    try {
        const res = await fetchWithTimeout(
            `https://www.thebluealliance.com/api/v3/event/${key}`,
            { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
        );
        if (res.ok) {
            CURRENT_EVENT_DETAIL = await res.json();
            updateEventStatusDisplay();
        }
    } catch(e) { console.warn('fetchEventDetail failed:', e); }
}

function formatEventType(typeNum) {
    const types = {
        0: 'Regional', 1: 'District', 2: 'District CMP', 3: 'Championship Division',
        4: 'Championship Finals', 5: 'District CMP Division', 6: 'FOC',
        7: 'Remote', 99: 'Offseason', 100: 'Preseason', [-1]: 'Unlabeled'
    };
    return types[typeNum] ?? 'Event';
}

function updateEventStatusDisplay() {
    const disp = document.getElementById('eventStatusDisplay');
    const ev   = CURRENT_EVENT_DETAIL || EVENTS_DATA[EVENT_KEY];
    if (!ev) {
        disp.textContent      = `Selected: ${EVENT_KEY}`;
        disp.style.color      = "var(--text-main)";
        disp.style.background = "rgba(255,255,255,0.05)";
        return;
    }

    const city    = ev.city ? `${ev.city}, ${ev.state_prov || ''} ${ev.country || ''}`.trim().replace(/,$/, '') : '';
    const dateStr = ev.start_date && ev.end_date ? `${ev.start_date} → ${ev.end_date}` : (ev.start_date || '');
    const typeStr = ev.event_type != null ? formatEventType(ev.event_type) : '';
    const week    = ev.week != null ? `Week ${ev.week + 1}` : '';
    const district = ev.district?.display_name || '';
    const webcast  = (CURRENT_EVENT_DETAIL?.webcasts || []).find(w => w.type === 'twitch' || w.type === 'youtube');
    const webcLink = webcast
        ? (webcast.type === 'twitch'
            ? `https://twitch.tv/${webcast.channel}`
            : `https://youtube.com/watch?v=${webcast.channel}`)
        : null;
    const meta = [typeStr, week, district, city].filter(Boolean).join(' · ');

    disp.style.background   = "var(--accent)";
    disp.style.color        = "#000";
    disp.style.borderRadius = "8px";
    disp.style.textAlign    = "left";
    disp.style.padding      = "10px 14px";
    disp.innerHTML = `
        <div style="font-weight:800;font-size:1rem;margin-bottom:3px;">✓ ${ev.name}</div>
        <div style="font-size:0.72rem;font-weight:600;opacity:0.75;margin-bottom:2px;">${ev.key}${meta ? ' · ' + meta : ''}</div>
        ${dateStr ? `<div style="font-size:0.72rem;font-weight:600;opacity:0.75;">📅 ${dateStr}</div>` : ''}
        ${webcLink ? `<div style="font-size:0.72rem;font-weight:700;margin-top:4px;">🎥 <a href="${webcLink}" target="_blank" style="color:#000;text-decoration:underline;">Watch Webcast</a></div>` : ''}
    `;
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
    document.getElementById('teamNameDisplay').innerHTML        = "Switching events...";
    document.getElementById('teamNameDisplay').style.background = "rgba(255,255,255,0.05)";
    fetchEventDetail(key);
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
        mergeManualRoster();
        document.getElementById('teamNum').dispatchEvent(new Event('input'));
    }
}

// ── Team Info Panel ────────────────────────────────────────────────────────
async function fetchTeamTBADetail(teamNum) {
    const panel = document.getElementById('teamTBADetail');
    if (!panel) return;
    panel.style.display = 'none';
    panel.innerHTML = '';

    // Always kick off image fetch in parallel
    //fetchRobotImage(teamNum);

    try {
        const [teamRes, awardsRes, eventsRes] = await Promise.all([
            fetchWithTimeout(
                `https://www.thebluealliance.com/api/v3/team/frc${teamNum}`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
            ),
            fetchWithTimeout(
                `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/awards`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
            ),
            fetchWithTimeout(
                `https://www.thebluealliance.com/api/v3/team/frc${teamNum}/events/2026/simple`,
                { headers: { 'X-TBA-Auth-Key': TBA_API_KEY } }
            )
        ]);

        if (!teamRes.ok) return;
        const teamData   = await teamRes.json();
        const awards     = awardsRes.ok ? await awardsRes.json() : [];
        const events2026 = eventsRes.ok ? await eventsRes.json() : [];

        const blueCount   = awards.filter(a => a.award_type === 1).length;
        const totalAwards = awards.length;
        const rookieYear  = teamData.rookie_year;
        const yearsExp    = rookieYear ? (2026 - rookieYear) : null;

        const eventList = events2026
            .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
            .slice(0, 5);

        const website  = teamData.website
            ? `<a href="${teamData.website}" target="_blank" style="color:var(--accent);text-decoration:underline;font-size:0.78rem;">${teamData.website.replace(/^https?:\/\//, '')}</a>`
            : '';

        const eventsHtml = eventList.length
            ? eventList.map(e => `<span style="display:inline-block;background:rgba(212,175,55,0.12);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:0.72rem;color:var(--accent);margin:2px 3px 2px 0;">${e.name}</span>`).join('')
            : '<span style="color:var(--text-secondary);font-size:0.78rem;">No 2026 events listed yet</span>';

        const tbaUrl = `https://www.thebluealliance.com/team/${teamNum}`;

        panel.innerHTML = `
            <div style="border-top:1px solid #2a2a2a;margin-top:12px;padding-top:12px;">
                <div style="font-size:0.7rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">TBA Team Profile</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                    ${rookieYear ? `<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;">
                        <div style="font-size:0.65rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Founded</div>
                        <div style="font-size:0.95rem;font-weight:700;color:var(--text-main);">${rookieYear} <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">(${yearsExp}y exp)</span></div>
                    </div>` : ''}
                    ${totalAwards > 0 ? `<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;">
                        <div style="font-size:0.65rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Career Awards</div>
                        <div style="font-size:0.95rem;font-weight:700;color:var(--text-main);">${totalAwards} ${blueCount > 0 ? `<span style="font-size:0.7rem;color:#33b5e5;font-weight:600;">(${blueCount} 🏆 Blue)</span>` : ''}</div>
                    </div>` : ''}
                    ${teamData.school_name ? `<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;grid-column:1/-1;">
                        <div style="font-size:0.65rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Org / School</div>
                        <div style="font-size:0.82rem;font-weight:600;color:var(--text-main);">${teamData.school_name}</div>
                    </div>` : ''}
                </div>
                <div style="margin-bottom:8px;">
                    <div style="font-size:0.65rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">2026 Events</div>
                    <div>${eventsHtml}</div>
                </div>
                ${website ? `<div style="margin-bottom:4px;">${website}</div>` : ''}
                <a href="${tbaUrl}" target="_blank" style="font-size:0.72rem;color:var(--text-secondary);text-decoration:none;display:inline-block;margin-top:2px;">🔗 View on The Blue Alliance</a>
            </div>
        `;
        panel.style.display = 'block';
    } catch(e) {
        console.warn('fetchTeamTBADetail failed:', e);
    }
}

// ── Startup ────────────────────────────────────────────────────────────────
fetchEvents();
fetchEventDetail(EVENT_KEY);
initTBA();
initRobotCounter();