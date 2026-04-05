/* =========================================
   qr.js — QR Code Generation + Scouted Data
   Version header added to all QR payloads.
   Supports edit/prefill from scouted list.
========================================= */

const SCOUTED_KEY  = 'SCOUTED_TEAMS_2026_V1';
const QR_VERSION   = 'v2';

function getScoutedTeams() {
    try { return JSON.parse(localStorage.getItem(SCOUTED_KEY) || '[]'); } catch(e) { return []; }
}

function saveScoutedEntry(entry) {
    const list     = getScoutedTeams();
    const filtered = list.filter(e => !(e.teamNum === entry.teamNum && e.eventKey === entry.eventKey));
    filtered.unshift(entry);
    safeLocalStorageSet(SCOUTED_KEY, JSON.stringify(filtered));
}

function clearScoutedTeams() {
    if (!confirm('Clear ALL scouted team data? This cannot be undone.')) return;
    localStorage.removeItem(SCOUTED_KEY);
    localStorage.setItem('ROBOT_COUNT', '0');
    setRobotCount(0);
    renderScoutedList();
    renderUnscoutedList();
}

function isTeamScouted(teamNum) {
    return getScoutedTeams().some(e => e.teamNum === String(teamNum) && e.eventKey === EVENT_KEY);
}

function getScoutedEntry(teamNum) {
    return getScoutedTeams().find(e => e.teamNum === String(teamNum) && e.eventKey === EVENT_KEY) || null;
}

function generateQR() {
    const teamNum        = document.getElementById('teamNum').value;
    const teamName       = TEAM_LIST[teamNum]?.name ?? "Unknown Team";
    const weightVal      = parseFloat(document.getElementById('weight').value);
    const unit           = document.getElementById('weightUnit').value;
    const finalWeightLbs = unit === 'kg' ? (weightVal * 2.20462).toFixed(1) : weightVal;
    const turretType     = document.querySelector('input[name="turretType"]:checked')?.value || 'None';
    const canDeg         = document.querySelector('input[name="canChangeDegree"]:checked')?.value || 'No';

    let turVals = `Type: ${turretType} | CanChangeDeg: ${canDeg}`;
    if (document.getElementById('yawTrigger').checked)
        turVals += ` | Yaw: ${document.getElementById('yawFreedomVal').value || '?'}°`;
    if (document.getElementById('pitchTrigger').checked)
        turVals += ` | Pitch: ${document.getElementById('pitchFreedomVal').value || '?'}°`;

    const climbLvl  = getMultiValues('climbLvl');
    const climbTime = document.getElementById('climbTime').value;

    const tsvValues = [
        QR_VERSION,
        parseInt(teamNum),
        document.getElementById('scouterName').value.replace(/[\t\n]/g, ' '),
        document.getElementById('chassis').value,
        finalWeightLbs,
        document.getElementById('capacity').value,
        getMultiValues('intake', 'intakeOtherVal'),
        getMultiValues('visionHard', 'visOtherVal'),
        getMultiValues('visionSoft', 'visSoftOtherVal'),
        getMultiValues('shoot'),
        turVals,
        getMultiValues('startPos'),
        document.getElementById('preload').value,
        getMultiValues('autoIntakePos') || 'None',
        getMultiValues('autoHangPos')   || 'None',
        document.getElementById('autoTotal').value,
        document.getElementById('crossMid').checked ? 1 : 0,
        getMultiValues('terrain'),
        climbLvl,
        getMultiValues('climbPos'),
        climbTime || 'N/A',
        document.getElementById('photosTaken').checked ? 1 : 0,
        document.getElementById('notes').value.replace(/[\t\n]/g, ' ')
    ];

    const compressed = LZString.compressToBase64(tsvValues.join('\t'));

    document.getElementById('qrTeamText').innerText   = teamNum;
    document.getElementById('qrTeamName').innerText   = teamName;
    document.getElementById('qrHeader').style.display = "block";

    const qrEl = document.getElementById('qrcode');
    qrEl.innerHTML     = '';
    qrEl.style.display = 'block';
    new QRCode(qrEl, {
        text: compressed, width: 256, height: 256,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });

    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('goToPathBtn').style.display = 'inline-block';

    incrementRobotCount();

    const entry = {
        teamNum: String(teamNum),
        teamName,
        eventKey:   EVENT_KEY,
        scouter:    document.getElementById('scouterName').value,
        chassis:    document.getElementById('chassis').value,
        weight:     `${finalWeightLbs} lbs`,
        capacity:   document.getElementById('capacity').value,
        intake:     getMultiValues('intake', 'intakeOtherVal'),
        visionHard: getMultiValues('visionHard', 'visOtherVal'),
        visionSoft: getMultiValues('visionSoft', 'visSoftOtherVal'),
        shoot:      getMultiValues('shoot'),
        turret:     turVals,
        startPos:   getMultiValues('startPos'),
        preload:    document.getElementById('preload').value,
        autoIntake: getMultiValues('autoIntakePos') || 'None',
        autoHang:   getMultiValues('autoHangPos')   || 'None',
        autoTotal:  document.getElementById('autoTotal').value,
        crossMid:   document.getElementById('crossMid').checked ? 'Yes' : 'No',
        terrain:    getMultiValues('terrain'),
        climbLvl,
        climbPos:   getMultiValues('climbPos'),
        climbTime:  climbTime || 'N/A',
        photos:     document.getElementById('photosTaken').checked ? 'Yes' : 'No',
        notes:      document.getElementById('notes').value,
        timestamp:  new Date().toLocaleString()
    };

    saveScoutedEntry(entry);
    renderScoutedList();
    renderUnscoutedList();
    updateStorageBar();
}

function generatePathQR() {
    if (strokes.length === 0) { alert("Please draw at least one path segment or place a dot."); return; }

    const teamNum   = document.getElementById('teamNum').value;
    const teamName  = TEAM_LIST[teamNum]?.name ?? "";
    const eventCode = EVENT_KEY.toUpperCase();

    document.getElementById('pathQrTeamText').innerText   = `Team ${teamNum}`;
    document.getElementById('pathQrHeader').style.display = "block";

    const qrContainer = document.getElementById('qrcodePath');
    qrContainer.innerHTML     = '';
    qrContainer.style.display = 'block';

    strokes.forEach((stroke, index) => {
        if (stroke.length < 1) return;
        const pathString = stroke.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
        const compressed = LZString.compressToBase64(
            [QR_VERSION, eventCode, '0', teamNum, pathString].join('\t')
        );

        const wrapper   = document.createElement('div');
        wrapper.style.cssText = "margin-bottom:20px;padding:15px;background:#fff;border-radius:10px;color:#000;text-align:center;";
        const label     = document.createElement('div');
        const entryType = stroke.length === 1 ? 'Position Dot' : `Auto Path #${index + 1}`;
        label.innerText = `Team ${teamNum}${teamName ? ` (${teamName})` : ''}\n${entryType}`;
        label.style.cssText = "font-weight:bold;margin-bottom:10px;font-size:1.1rem;line-height:1.4;";
        const qrDiv = document.createElement('div');
        wrapper.appendChild(label);
        wrapper.appendChild(qrDiv);
        qrContainer.appendChild(wrapper);
        new QRCode(qrDiv, {
            text: compressed, width: 200, height: 200,
            colorDark: "#D4AF37", colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L
        });
    });

    document.getElementById('generatePathBtn').innerText = "Update Path QRs";
}

function renderScoutedList() {
    const container = document.getElementById('scoutedListContainer');
    if (!container) return;
    const list = getScoutedTeams().filter(e => e.eventKey === EVENT_KEY);

    if (list.length === 0) {
        container.innerHTML = `<div style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:10px;">No teams scouted yet for this event.</div>`;
        return;
    }

    container.innerHTML = list.map(e => `
        <div class="scouted-row">
            <div class="scouted-num">${e.teamNum}</div>
            <div class="scouted-info">
                <div class="scouted-name">${e.teamName}</div>
                <div class="scouted-meta">${e.scouter} · ${e.timestamp}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <div class="scouted-badge">${e.chassis}</div>
                <button type="button" class="scouted-action-btn" onclick="openQuickView('${e.teamNum}')">👁</button>
                <button type="button" class="scouted-action-btn scouted-edit-btn" onclick="editEntry('${e.teamNum}')">✏️</button>
            </div>
        </div>
    `).join('');
}

function renderUnscoutedList() {
    const container = document.getElementById('unscoutedListContainer');
    if (!container) return;

    const allTeams    = Object.keys(TEAM_LIST).map(Number).sort((a, b) => a - b);
    const scoutedNums = new Set(
        getScoutedTeams().filter(e => e.eventKey === EVENT_KEY).map(e => Number(e.teamNum))
    );
    const unscouted = allTeams.filter(n => !scoutedNums.has(n));

    if (allTeams.length === 0) {
        container.innerHTML = `<div style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:10px;">No team list loaded yet.</div>`;
        return;
    }
    if (unscouted.length === 0) {
        container.innerHTML = `<div style="color:var(--success);font-size:0.9rem;font-weight:700;text-align:center;padding:10px;">🎉 All teams scouted!</div>`;
        return;
    }

    const chips = unscouted.map(n => `
        <span class="unscouted-chip" onclick="jumpToTeam(${n})">${n}</span>
    `).join('');

    container.innerHTML = `
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">
            ${unscouted.length} of ${allTeams.length} remaining — tap a number to scout them
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${chips}</div>
    `;
}

function jumpToTeam(teamNum) {
    document.querySelector('.page.active').classList.remove('active');
    currentPage = 0;
    document.getElementById('page0').classList.add('active');
    document.getElementById('backBtn').style.visibility = 'hidden';
    document.getElementById('nextBtn').style.display    = 'block';
    document.querySelector('.nav-bar').style.display    = 'flex';
    document.body.style.paddingBottom = '100px';

    const input = document.getElementById('teamNum');
    input.value = teamNum;
    input.dispatchEvent(new Event('input'));
    window.scrollTo(0, 0);
}

let _quickViewTeamNum = null;

function openQuickView(teamNum) {
    const entry = getScoutedEntry(teamNum);
    if (!entry) return;
    _quickViewTeamNum = teamNum;

    document.getElementById('quickViewTitle').innerText = `Team ${entry.teamNum} — ${entry.teamName}`;

    const fields = [
        ['Scouter',         entry.scouter],
        ['Chassis',         entry.chassis],
        ['Weight',          entry.weight],
        ['Capacity',        entry.capacity],
        ['Intake',          entry.intake   || 'None'],
        ['Vision HW',       entry.visionHard || 'None'],
        ['Vision SW',       entry.visionSoft || 'None'],
        ['Shooting',        entry.shoot    || 'None'],
        ['Turret',          entry.turret],
        ['Start Pos',       entry.startPos || 'None'],
        ['Preload',         entry.preload],
        ['Auto Intake',     entry.autoIntake],
        ['Auto Hang',       entry.autoHang],
        ['Auto Total',      entry.autoTotal],
        ['Cross Midfield',  entry.crossMid],
        ['Terrain',         entry.terrain  || 'None'],
        ['Climb Levels',    entry.climbLvl || 'None'],
        ['Climb Position',  entry.climbPos || 'None'],
        ['Climb Time',      entry.climbTime],
        ['Photos',          entry.photos],
        ['Notes',           entry.notes    || '—'],
        ['Timestamp',       entry.timestamp],
    ];

    let html = '';
    fields.forEach(([label, value]) => {
        html += `<div style="display:flex;justify-content:space-between;margin-bottom:5px;border-bottom:1px solid #1e1e26;padding-bottom:4px;">
            <span style="color:var(--text-secondary);flex:0 0 42%;">${label}</span>
            <span style="color:white;flex:1;text-align:right;word-break:break-word;">${value ?? '—'}</span>
        </div>`;
    });

    document.getElementById('quickViewContent').innerHTML = html;
    document.getElementById('quickViewModal').style.display = 'flex';
}

function closeQuickView() {
    document.getElementById('quickViewModal').style.display = 'none';
    _quickViewTeamNum = null;
}

function editFromQuickView() {
    const num = _quickViewTeamNum;
    closeQuickView();
    if (num) editEntry(num);
}

function editEntry(teamNum) {
    const entry = getScoutedEntry(teamNum);
    if (!entry) return;

    document.querySelector('.page.active').classList.remove('active');
    currentPage = 0;
    document.getElementById('page0').classList.add('active');
    document.getElementById('backBtn').style.visibility = 'hidden';
    document.getElementById('nextBtn').style.display    = 'block';
    document.querySelector('.nav-bar').style.display    = 'flex';
    document.body.style.paddingBottom = '100px';
    window.scrollTo(0, 0);

    setTimeout(() => prefillForm(entry), 50);
}

function prefillForm(e) {
    document.getElementById('teamNum').value = e.teamNum;
    document.getElementById('teamNum').dispatchEvent(new Event('input'));

    const scouterSel = document.getElementById('scouterName');
    for (const opt of scouterSel.options) {
        if (opt.value === e.scouter) { opt.selected = true; break; }
    }

    const chassisSel = document.getElementById('chassis');
    for (const opt of chassisSel.options) {
        if (opt.value === e.chassis) { opt.selected = true; break; }
    }

    const weightMatch = (e.weight || '').match(/([\d.]+)/);
    if (weightMatch) document.getElementById('weight').value = weightMatch[1];

    document.getElementById('capacity').value = e.capacity || '';

    function setCheckboxes(name, valueStr) {
        const vals = (valueStr || '').split(' + ').map(v => v.trim()).filter(Boolean);
        document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
            cb.checked = vals.includes(cb.value);
        });
    }

    setCheckboxes('intake',    e.intake);
    setCheckboxes('visionHard', e.visionHard);
    setCheckboxes('visionSoft', e.visionSoft);
    setCheckboxes('shoot',     e.shoot);

    const turretMatch = (e.turret || '').match(/Type: ([^|]+)/);
    if (turretMatch) {
        const tval = turretMatch[1].trim();
        document.querySelectorAll('input[name="turretType"]').forEach(r => {
            r.checked = r.value === tval;
        });
        checkTurretType();
    }

    const degMatch = (e.turret || '').match(/CanChangeDeg: (\w+)/);
    if (degMatch) {
        const dval = degMatch[1].trim();
        document.getElementById('canDegYes').checked = dval === 'Yes';
        document.getElementById('canDegNo').checked  = dval === 'No';
        toggleDegreeOptions();
    }

    setCheckboxes('startPos',      e.startPos);
    document.getElementById('preload').value   = e.preload   || '';
    setCheckboxes('autoIntakePos', e.autoIntake);
    setCheckboxes('autoHangPos',   e.autoHang);
    document.getElementById('autoTotal').value = e.autoTotal || '';
    document.getElementById('crossMid').checked = e.crossMid === 'Yes';
    setCheckboxes('terrain', e.terrain);

    setCheckboxes('climbLvl', e.climbLvl);
    updateClimbTimeVisibility();
    setCheckboxes('climbPos', e.climbPos);
    const ct = e.climbTime === 'N/A' ? '' : e.climbTime;
    document.getElementById('climbTime').value     = ct || '';
    document.getElementById('photosTaken').checked = e.photos === 'Yes';
    document.getElementById('notes').value         = e.notes || '';
    document.getElementById('notesCounter').innerText = `${(e.notes || '').length} / 300`;

    updateNavButtons();
}

function exportCSV() {
    const list = getScoutedTeams().filter(e => e.eventKey === EVENT_KEY);
    if (list.length === 0) { alert("No scouted data to export."); return; }

    const headers = [
        'Team #','Team Name','Event','Scouter','Chassis','Weight','Capacity',
        'Intake','Vision Hardware','Vision Software','Shooting',
        'Turret','Start Position','Preload','Auto Intake','Auto Hang',
        'Auto Total','Cross Midfield','Terrain',
        'Climb Level','Climb Position','Climb Time',
        'Photos','Notes','Timestamp'
    ];
    const rows = list.map(e => [
        e.teamNum, e.teamName, e.eventKey, e.scouter, e.chassis, e.weight, e.capacity,
        e.intake, e.visionHard, e.visionSoft, e.shoot,
        e.turret, e.startPos, e.preload, e.autoIntake, e.autoHang,
        e.autoTotal, e.crossMid, e.terrain,
        e.climbLvl, e.climbPos, e.climbTime,
        e.photos,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.timestamp
    ].map(v => v == null ? '' : v));

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pit_scouting_${EVENT_KEY}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
