/* =========================================
   form.js — UI Logic, Validation & Navigation
========================================= */

const BAD_WORDS = [
    "damn","hell","shit","fuck","bitch","crap","ass","bastard",
    "dick","piss","cock","pussy","slut","whore","nigger","fag",
    "retard","sex","nude","gyatt","nigga","hitler","nigg"
];

let currentPage = 0;

// ── Clock ──────────────────────────────────────────────────────────────────
setInterval(() => {
    document.getElementById('liveClock').innerText =
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

// ── Fullscreen ─────────────────────────────────────────────────────────────
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err.message));
    } else {
        document.exitFullscreen?.();
    }
}

// ── Settings Panel ─────────────────────────────────────────────────────────
function openSettings() {
    renderManualRosterList();
    renderAssignmentList();
    refreshAssignmentTeamSelect();
    updateStorageBar();
    document.getElementById('settingsPanel').style.display = 'flex';
}
function closeSettings() {
    document.getElementById('settingsPanel').style.display = 'none';
}

// ── Scouter Assignments (team-picker, not range) ───────────────────────────
const ASSIGNMENTS_KEY = 'SCOUTER_ASSIGNMENTS_V2';

function getAssignments() {
    try { return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || '[]'); } catch(e) { return []; }
}

// Build the multi-select of available teams (sorted numerically)
function refreshAssignmentTeamSelect() {
    const sel = document.getElementById('assignTeamSelect');
    if (!sel) return;
    const assigned = new Set(getAssignments().flatMap(a => a.teams || []));
    const teams = Object.keys(TEAM_LIST).map(Number).sort((a, b) => a - b);
    sel.innerHTML = teams.map(num => {
        const name = TEAM_LIST[num]?.name || '';
        const alr  = assigned.has(num) ? ' (assigned)' : '';
        return `<option value="${num}">${num} — ${name}${alr}</option>`;
    }).join('');
    if (teams.length === 0) {
        sel.innerHTML = '<option value="" disabled>No teams loaded yet</option>';
    }
}

function addAssignment() {
    const scouter = document.getElementById('assignScouter').value;
    const sel     = document.getElementById('assignTeamSelect');
    if (!scouter) { alert('Please select a scouter pair.'); return; }
    const selected = Array.from(sel.selectedOptions).map(o => parseInt(o.value)).filter(Boolean);
    if (selected.length === 0) { alert('Please select at least one team.'); return; }

    const list = getAssignments();
    // Merge into existing entry for same scouter, or create new
    const existing = list.find(a => a.scouter === scouter);
    if (existing) {
        const merged = Array.from(new Set([...existing.teams, ...selected])).sort((a, b) => a - b);
        existing.teams = merged;
    } else {
        list.push({ scouter, teams: selected.sort((a, b) => a - b) });
    }
    safeLocalStorageSet(ASSIGNMENTS_KEY, JSON.stringify(list));

    // Deselect
    Array.from(sel.options).forEach(o => o.selected = false);
    renderAssignmentList();
    refreshAssignmentTeamSelect();
}

function removeAssignment(index) {
    const list = getAssignments();
    list.splice(index, 1);
    safeLocalStorageSet(ASSIGNMENTS_KEY, JSON.stringify(list));
    renderAssignmentList();
    refreshAssignmentTeamSelect();
}

function removeTeamFromAssignment(scouterName, teamNum) {
    const list = getAssignments();
    const entry = list.find(a => a.scouter === scouterName);
    if (!entry) return;
    entry.teams = entry.teams.filter(t => t !== teamNum);
    if (entry.teams.length === 0) list.splice(list.indexOf(entry), 1);
    safeLocalStorageSet(ASSIGNMENTS_KEY, JSON.stringify(list));
    renderAssignmentList();
    refreshAssignmentTeamSelect();
}

function renderAssignmentList() {
    const container = document.getElementById('assignmentList');
    if (!container) return;
    const list = getAssignments();
    if (list.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.8rem;">No assignments yet.</div>';
        return;
    }
    container.innerHTML = list.map(function(a, i) {
        const chips = (a.teams || []).map(function(t) {
            return '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(212,175,55,0.15);border:1px solid var(--border);border-radius:6px;padding:2px 7px;font-size:0.72rem;color:var(--accent);cursor:pointer;margin:2px;" onclick="removeTeamFromAssignment(\'' + a.scouter.replace(/'/g, "\\'") + '\',' + t + ')">' + t + ' \u2715</span>';
        }).join('');
        return '<div style="padding:8px 0;border-bottom:1px solid #222;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">' +
            '<span style="color:var(--accent);font-size:0.8rem;font-weight:700;">' + a.scouter + '</span>' +
            '<button type="button" onclick="removeAssignment(' + i + ')" style="background:var(--danger);color:white;border:none;border-radius:6px;padding:3px 8px;font-size:0.75rem;cursor:pointer;">Remove All</button>' +
            '</div>' +
            '<div style="display:flex;flex-wrap:wrap;">' + (chips || '<span style="color:var(--text-secondary);font-size:0.78rem;">No teams</span>') + '</div>' +
            '</div>';
    }).join('');
}

function updateAssignmentHint() {
    const scouter = document.getElementById('scouterName').value;
    const hint    = document.getElementById('assignmentHint');
    const teamNum = parseInt(document.getElementById('teamNum').value);
    if (!scouter || !hint) { if (hint) hint.style.display = 'none'; return; }
    const match = getAssignments().find(a => a.scouter === scouter);
    if (match && match.teams?.length > 0) {
        const isAssigned = match.teams.includes(teamNum);
        const teamListStr = match.teams.join(', ');
        hint.innerHTML  = `📋 Your teams: <strong>${teamListStr}</strong>${isAssigned ? ' ✓ (this team is yours)' : ''}`;
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }
}

document.getElementById('scouterName').addEventListener('change', updateAssignmentHint);

// ── Duplicate Modal ────────────────────────────────────────────────────────
let _duplicateTeamNum = null;

function checkDuplicate(teamNum) {
    if (!teamNum) return;
    const entry = getScoutedEntry(String(teamNum));
    const hint  = document.getElementById('duplicateHint');
    if (entry) {
        hint.textContent   = `⚠️ Already scouted by ${entry.scouter} at ${entry.timestamp}`;
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }
}

function showDuplicateModal(teamNum) {
    const entry = getScoutedEntry(String(teamNum));
    if (!entry) return false;
    _duplicateTeamNum = teamNum;
    document.getElementById('duplicateModalBody').textContent =
        `Team ${teamNum} (${entry.teamName}) was already scouted by ${entry.scouter} at ${entry.timestamp}. Do you want to re-scout and overwrite?`;
    document.getElementById('duplicateModal').style.display = 'flex';
    return true;
}

function dismissDuplicateModal() {
    document.getElementById('duplicateModal').style.display = 'none';
    _duplicateTeamNum = null;
}

function proceedDespiteDuplicate() {
    document.getElementById('duplicateModal').style.display = 'none';
    _duplicateTeamNum = null;
    _doNavigate(1);
}

// ── Turret / Degree Logic ──────────────────────────────────────────────────
function toggleDegreeOptions() {
    const yes = document.getElementById('canDegYes').checked;
    const box = document.getElementById('degreeOptionsBox');
    box.style.display = yes ? 'block' : 'none';
    if (!yes) {
        document.querySelectorAll('input[name="turretAxis"]').forEach(cb => cb.checked = false);
        document.getElementById('yawFreedomBox').style.display   = 'none';
        document.getElementById('pitchFreedomBox').style.display = 'none';
        document.getElementById('yawFreedomVal').value  = '';
        document.getElementById('pitchFreedomVal').value = '';
    }
}

function checkTurretType() {
    const degreeSection = document.getElementById('degree-section');
    const yawOption     = document.getElementById('yawTrigger');
    const yawLabel      = yawOption ? yawOption.closest('label') : null;

    let selected = '';
    for (const r of document.getElementsByName('turretType')) {
        if (r.checked) { selected = r.value; break; }
    }

    if (selected === 'Single' || selected === 'Double') {
        degreeSection.style.display = 'block';
        // Restore yaw option for single/double
        if (yawLabel) yawLabel.style.display = '';
    } else if (selected === 'Wide Shooter') {
        degreeSection.style.display = 'block';
        // Hide yaw (left/right) — wide shooter can only change pitch
        if (yawLabel) yawLabel.style.display = 'none';
        // Uncheck yaw if it was previously checked
        if (yawOption) {
            yawOption.checked = false;
            document.getElementById('yawFreedomBox').style.display = 'none';
            document.getElementById('yawFreedomVal').value = '';
        }
    } else {
        degreeSection.style.display = 'none';
    }
}
function toggleAxisInput(axis) {
    const boxId = axis === 'yaw' ? 'yawFreedomBox' : 'pitchFreedomBox';
    const cbId  = axis === 'yaw' ? 'yawTrigger'    : 'pitchTrigger';
    document.getElementById(boxId).style.display = document.getElementById(cbId).checked ? 'block' : 'none';
    if (!document.getElementById(cbId).checked)
        document.getElementById(axis + 'FreedomVal').value = '';
}

// ── Climb Time Show/Hide ───────────────────────────────────────────────────
function updateClimbTimeVisibility() {
    const anyClimb = document.querySelectorAll('input[name="climbLvl"]:checked').length > 0;
    const card     = document.getElementById('climbTimeCard');
    if (card) {
        card.style.display = anyClimb ? 'block' : 'none';
        if (!anyClimb) document.getElementById('climbTime').value = '';
    }
    updateNavButtons();
}
document.querySelectorAll('input[name="climbLvl"]').forEach(cb => {
    cb.addEventListener('change', updateClimbTimeVisibility);
});

// ── Notes Character Counter ────────────────────────────────────────────────
document.getElementById('notes').addEventListener('input', function() {
    document.getElementById('notesCounter').innerText = `${this.value.length} / 300`;
    updateNavButtons();
});

// ── "Other" Conditional Inputs ─────────────────────────────────────────────
function setupOtherToggle(triggerId, boxId) {
    document.getElementById(triggerId).addEventListener('change', function(e) {
        const box = document.getElementById(boxId);
        if (e.target.checked) { box.style.display = 'block'; box.querySelector('input').focus(); }
        else { box.style.display = 'none'; box.querySelector('input').value = ''; }
    });
}
setupOtherToggle('intakeOtherTrigger', 'intakeOtherBox');
setupOtherToggle('visOtherTrigger',    'visOtherBox');
setupOtherToggle('visSoftOtherTrigger','visSoftOtherBox');

// ── Event Autocomplete ─────────────────────────────────────────────────────
const eventSearchInput = document.getElementById('eventSearch');
const eventDropdown    = document.getElementById('eventDropdown');

eventSearchInput.addEventListener('input', function() {
    const val = this.value.toLowerCase().trim();
    eventDropdown.innerHTML = '';
    if (!val) { eventDropdown.style.display = 'none'; return; }
    let count = 0;
    for (const key in EVENTS_DATA) {
        if (count > 50) break;
        const ev  = EVENTS_DATA[key];
        const str = `${ev.key} ${ev.name} ${ev.city || ''}`.toLowerCase();
        if (!str.includes(val)) continue;
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `
            <div class="autocomplete-item-title">${ev.name}</div>
            <div class="autocomplete-item-sub">${ev.key} • ${ev.city || 'Location Unknown'}</div>
        `;
        div.addEventListener('click', () => {
            selectEvent(ev.key);
            eventSearchInput.value      = '';
            eventDropdown.style.display = 'none';
        });
        eventDropdown.appendChild(div);
        count++;
    }
    eventDropdown.style.display = count > 0 ? 'block' : 'none';
});
document.addEventListener('click', e => {
    if (e.target !== eventSearchInput) eventDropdown.style.display = 'none';
});

// ── Team Number Input ──────────────────────────────────────────────────────
document.getElementById('teamNum').addEventListener('input', function() {
    const num  = this.value;
    const disp = document.getElementById('teamNameDisplay');

    resetImageUI();
    clearTimeout(imageFetchTimeout);
    if (currentImageFetchController) {
        currentImageFetchController.abort();
        currentImageFetchController = null;
    }

    checkDuplicate(num);
    updateAssignmentHint();

    if (tbaStatus === "loaded" || tbaStatus === "empty") {
        if (TEAM_LIST[num]) {
            const team = TEAM_LIST[num];
            disp.innerHTML = `
                <div style="font-size:1.15rem;margin-bottom:4px;color:#000;">✓ ${team.name}</div>
                <div style="font-size:0.8rem;color:#333;font-weight:600;">📍 ${team.location}</div>
            `;
            disp.style.background = "var(--accent)";
            imageFetchTimeout = setTimeout(() => fetchRobotImage(num), 600);
        } else {
            disp.textContent      = num ? (tbaStatus === "empty" ? `Team ${num} (TBA list empty)` : "Not in TBA Official List") : "Waiting for input...";
            disp.style.color      = num ? (tbaStatus === "empty" ? "#000" : "var(--danger)") : "var(--accent)";
            disp.style.background = num && tbaStatus === "empty" ? "var(--accent)" : "rgba(255,255,255,0.05)";
        }
    } else if (tbaStatus === "loading") {
        disp.textContent      = "Fetching TBA Teams...";
        disp.style.color      = "var(--accent)";
        disp.style.background = "rgba(255,255,255,0.05)";
    } else {
        disp.textContent      = num ? `Team ${num} (Offline Mode)` : "API Error. Enter any team.";
        disp.style.color      = num ? "#000" : "var(--danger)";
        disp.style.background = num ? "var(--accent)" : "rgba(255,68,68,0.1)";
    }

    updateNavButtons();
});

[
    'scouterName','weight','capacity','preload','autoTotal',
    'climbTime','intakeOtherVal','visOtherVal','visSoftOtherVal',
    'yawFreedomVal','pitchFreedomVal'
].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateNavButtons);
});

// ── Profanity Check ────────────────────────────────────────────────────────
function containsProfanity(text) {
    if (!text) return false;
    return BAD_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
}

// ── Navigation & Validation ────────────────────────────────────────────────
function updateNavButtons() {
    const nextBtn = document.getElementById('nextBtn');
    let isValid   = true;

    if (currentPage === 0) {
        const name = document.getElementById('scouterName').value.trim();
        const team = document.getElementById('teamNum').value.trim();

        if (!name) {
            document.getElementById('err-name').style.display = 'block';
            document.getElementById('scouterName').classList.add('violation');
            isValid = false;
        } else {
            document.getElementById('err-name').style.display = 'none';
            document.getElementById('scouterName').classList.remove('violation');
        }

        if (!team) {
            document.getElementById('err-team').style.display = 'none';
            isValid = false;
        } else if (tbaStatus === "loaded" && !TEAM_LIST[team]) {
            document.getElementById('err-team').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('err-team').style.display = 'none';
        }
    }
    else if (currentPage === 1) {
        const weightVal = parseFloat(document.getElementById('weight').value);
        const capVal    = parseFloat(document.getElementById('capacity').value);
        const unit      = document.getElementById('weightUnit').value;
        const weightLbs = unit === 'kg' ? weightVal * 2.20462 : weightVal;

        if (!document.getElementById('weight').value || !document.getElementById('capacity').value) {
            isValid = false;
        } else if (weightVal <= 0) {
            document.getElementById('err-weight').innerText = "Weight must be greater than 0";
            document.getElementById('err-weight').style.display = 'block';
            document.getElementById('weight').classList.add('violation');
            isValid = false;
        } else if (weightLbs > 135) {
            document.getElementById('err-weight').innerText = "Max Weight is 135 lbs (61.2 kg)";
            document.getElementById('err-weight').style.display = 'block';
            document.getElementById('weight').classList.add('violation');
            isValid = false;
        } else if (capVal <= 0) {
            isValid = false;
        } else {
            document.getElementById('err-weight').style.display = 'none';
            document.getElementById('weight').classList.remove('violation');
        }

        if (document.getElementById('intakeOtherBox').style.display === 'block' &&
            !document.getElementById('intakeOtherVal').value.trim()) isValid = false;
        if (document.getElementById('visOtherBox').style.display === 'block' &&
            !document.getElementById('visOtherVal').value.trim()) isValid = false;
        if (document.getElementById('visSoftOtherBox').style.display === 'block' &&
            !document.getElementById('visSoftOtherVal').value.trim()) isValid = false;
    }
    else if (currentPage === 2) {
        const preloadVal   = document.getElementById('preload').value;
        const autoTotalVal = document.getElementById('autoTotal').value;
        const preload      = parseFloat(preloadVal);
        const autoTotal    = parseFloat(autoTotalVal);
        const capacity     = parseFloat(document.getElementById('capacity').value) || 0;
        const errEl        = document.getElementById('err-preload');

        if (!preloadVal || !autoTotalVal) {
            isValid = false;
        } else if (preload < 0) {
            errEl.innerText = "Preload cannot be negative";
            errEl.style.display = 'block';
            document.getElementById('preload').classList.add('violation');
            isValid = false;
        } else if (preload > 8) {
            errEl.innerText = "Max Preload is 8";
            errEl.style.display = 'block';
            document.getElementById('preload').classList.add('violation');
            isValid = false;
        } else if (preload > capacity) {
            errEl.innerText = `Preload > Capacity (${capacity})`;
            errEl.style.display = 'block';
            document.getElementById('preload').classList.add('violation');
            isValid = false;
        } else if (autoTotal < 0 || autoTotal > 499) {
            // Updated: max 499 auto balls
            document.getElementById('err-preload').style.display = 'none';
            document.getElementById('preload').classList.remove('violation');
            if (autoTotal < 0 || autoTotal > 499) isValid = false;
        } else {
            errEl.style.display = 'none';
            document.getElementById('preload').classList.remove('violation');
        }
    }
    else if (currentPage === 3) {
        const notes    = document.getElementById('notes').value;
        const anyClimb = document.querySelectorAll('input[name="climbLvl"]:checked').length > 0;
        if (anyClimb && !document.getElementById('climbTime').value) isValid = false;
        if (containsProfanity(notes)) {
            document.getElementById('profanity-notes').style.display = 'block';
            document.getElementById('notes').classList.add('violation');
            isValid = false;
        } else {
            document.getElementById('profanity-notes').style.display = 'none';
            document.getElementById('notes').classList.remove('violation');
        }
    }

    nextBtn.disabled = !isValid;
}

// ── Navigation ─────────────────────────────────────────────────────────────
function navigate(dir) {
    if (dir === 1 && document.getElementById('nextBtn').disabled) return;

    if (dir === 1 && currentPage === 0) {
        const teamNum = document.getElementById('teamNum').value.trim();
        if (showDuplicateModal(teamNum)) return;
    }

    _doNavigate(dir);
}

function _doNavigate(dir) {
    document.getElementById(`page${currentPage}`).classList.remove('active');
    currentPage += dir;
    document.getElementById(`page${currentPage}`).classList.add('active');
    document.getElementById('backBtn').style.visibility = currentPage === 0 ? 'hidden' : 'visible';

    if (currentPage === 4) {
        document.getElementById('nextBtn').style.display = 'none';
        document.querySelector('.nav-bar').style.display = 'none';
        document.body.style.paddingBottom = '0';
        prepareReview();
        renderScoutedList();
        renderUnscoutedList();
    } else if (currentPage === 5) {
        document.getElementById('nextBtn').style.display = 'none';
        document.querySelector('.nav-bar').style.display = 'none';
        document.body.style.paddingBottom = '0';
        initCanvas();
    } else {
        document.getElementById('nextBtn').style.display = 'block';
        document.querySelector('.nav-bar').style.display = 'flex';
        document.body.style.paddingBottom = '100px';
        updateNavButtons();
    }
    window.scrollTo(0, 0);
}

// ── Multi-checkbox Helper ──────────────────────────────────────────────────
function getMultiValues(name, otherId = null) {
    const vals = [];
    document.querySelectorAll(`input[name="${name}"]:checked`).forEach(cb => {
        if (otherId && cb.id.includes('Other')) {
            const txt = document.getElementById(otherId).value.trim();
            if (txt) vals.push("Other: " + txt);
        } else {
            vals.push(cb.value);
        }
    });
    return vals.join(' + ');
}

// ── Review Page ────────────────────────────────────────────────────────────
function prepareReview() {
    const t         = document.getElementById('teamNum').value;
    const name      = TEAM_LIST[t]?.name ?? "Unknown";
    const unit      = document.getElementById('weightUnit').value;
    const weightVal = document.getElementById('weight').value;
    const weightLbs = unit === 'kg' ? (parseFloat(weightVal) * 2.20462).toFixed(1) : weightVal;

    const turretType = document.querySelector('input[name="turretType"]:checked')?.value || 'None';
    const canDeg     = document.querySelector('input[name="canChangeDegree"]:checked')?.value || 'No';
    let turretStr    = `${turretType}, Can Change Deg: ${canDeg}`;
    if (document.getElementById('yawTrigger').checked)
        turretStr += `, Yaw: ${document.getElementById('yawFreedomVal').value || '?'}°`;
    if (document.getElementById('pitchTrigger').checked)
        turretStr += `, Pitch: ${document.getElementById('pitchFreedomVal').value || '?'}°`;

    const anyClimb = document.querySelectorAll('input[name="climbLvl"]:checked').length > 0;

    const fields = [
        ['Event',           EVENT_KEY],
        ['Scouter',         document.getElementById('scouterName').value],
        ['─── Robot ───',   ''],
        ['Chassis',         document.getElementById('chassis').value],
        ['Weight',          `${weightLbs} lbs`],
        ['Max Capacity',    document.getElementById('capacity').value],
        ['Intake',          getMultiValues('intake', 'intakeOtherVal') || 'None'],
        ['Vision Hardware', getMultiValues('visionHard', 'visOtherVal') || 'None'],
        ['Vision Software', getMultiValues('visionSoft', 'visSoftOtherVal') || 'None'],
        ['Shooting',        getMultiValues('shoot') || 'None'],
        ['Turret',          turretStr],
        ['─── Auto ───',    ''],
        ['Start Position',  getMultiValues('startPos') || 'None'],
        ['Preload',         document.getElementById('preload').value],
        ['Auto Intake',     getMultiValues('autoIntakePos') || 'None'],
        ['Auto Hang',       getMultiValues('autoHangPos') || 'None'],
        ['Auto Total',      document.getElementById('autoTotal').value],
        ['Cross Midfield',  document.getElementById('crossMid').checked ? 'Yes' : 'No'],
        ['Terrain',         getMultiValues('terrain') || 'None'],
        ['─── Endgame ───', ''],
        ['Climb Levels',    getMultiValues('climbLvl') || 'None'],
        ['Climb Position',  getMultiValues('climbPos') || 'None'],
        ['Climb Time',      anyClimb ? `${document.getElementById('climbTime').value}s` : 'N/A'],
        ['Photos Taken',    document.getElementById('photosTaken').checked ? 'Yes' : 'No'],
        ['Notes',           document.getElementById('notes').value || '—'],
    ];

    let html = `<strong style="color:var(--accent);font-size:1rem;">Team ${t} — ${name}</strong><br><br>`;
    fields.forEach(([label, value]) => {
        if (label.startsWith('─')) {
            html += `<div style="color:var(--accent);font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px;">${label}</div>`;
        } else {
            html += `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="color:var(--text-secondary);flex:0 0 44%;">${label}</span>
                <span style="color:white;flex:1;text-align:right;">${value}</span>
            </div>`;
        }
    });
    document.getElementById('reviewText').innerHTML = html;
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetForm() {
    if (!confirm("Are you sure you want to finish and reset?")) return;

    document.getElementById('scoutForm').reset();
    document.getElementById('eventSearch').value = '';

    ['intakeOtherBox','visOtherBox','visSoftOtherBox','yawFreedomBox','pitchFreedomBox']
        .forEach(id => document.getElementById(id).style.display = 'none');

    const disp = document.getElementById('teamNameDisplay');
    disp.textContent      = "Waiting for input...";
    disp.style.color      = "var(--accent)";
    disp.style.background = "rgba(255,255,255,0.05)";

    document.getElementById('duplicateHint').style.display  = 'none';
    document.getElementById('assignmentHint').style.display = 'none';
    document.getElementById('notesCounter').innerText       = '0 / 300';

    resetImageUI();
    clearTimeout(imageFetchTimeout);
    if (currentImageFetchController) {
        currentImageFetchController.abort();
        currentImageFetchController = null;
    }

    document.getElementById('qrHeader').style.display     = 'none';
    document.getElementById('pathQrHeader').style.display = 'none';
    document.querySelectorAll('.error-msg').forEach(el      => el.style.display = 'none');
    document.querySelectorAll('.profanity-alert').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.violation').forEach(el      => el.classList.remove('violation'));

    document.getElementById('qrcode').innerHTML     = '';
    document.getElementById('qrcode').style.display = 'none';
    document.getElementById('qrcodePath').innerHTML     = '';
    document.getElementById('qrcodePath').style.display = 'none';

    document.getElementById('generateBtn').style.display = 'inline-block';
    document.getElementById('goToPathBtn').style.display = 'none';
    const pathBtn     = document.getElementById('generatePathBtn');
    pathBtn.style.display = 'inline-block';
    pathBtn.innerText     = 'Generate Path QRs';

    const climbTimeCard = document.getElementById('climbTimeCard');
    if (climbTimeCard) climbTimeCard.style.display = 'none';

    strokes = []; currentStroke = [];

    document.querySelector('.page.active').classList.remove('active');
    currentPage = 0;
    document.getElementById('page0').classList.add('active');
    document.getElementById('backBtn').style.visibility = 'hidden';
    document.getElementById('nextBtn').style.display    = 'block';
    document.querySelector('.nav-bar').style.display    = 'flex';
    document.body.style.paddingBottom = '100px';

    document.getElementById('teamNum').dispatchEvent(new Event('input'));
    updateNavButtons();
    window.scrollTo(0, 0);
}

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById('backBtn').style.visibility = 'hidden';
const _ctCard = document.getElementById('climbTimeCard');
if (_ctCard) _ctCard.style.display = 'none';
updateNavButtons();
