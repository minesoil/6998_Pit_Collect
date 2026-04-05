/* =========================================
   qr.js — QR Code Generation
   Data QR (Step 6) and Path QR (Step 7)
========================================= */

// ── Scouted Data Storage ───────────────────────────────────────────────────
const SCOUTED_KEY = 'SCOUTED_TEAMS_2026_V1';

function getScoutedTeams() {
    try { return JSON.parse(localStorage.getItem(SCOUTED_KEY) || '[]'); } catch(e) { return []; }
}

function saveScoutedEntry(entry) {
    const list = getScoutedTeams();
    // Remove previous entry for same team+event if re-scouted
    const filtered = list.filter(e => !(e.teamNum === entry.teamNum && e.eventKey === entry.eventKey));
    filtered.unshift(entry); // most recent first
    localStorage.setItem(SCOUTED_KEY, JSON.stringify(filtered));
}

function clearScoutedTeams() {
    if (confirm('Clear ALL scouted team data? This cannot be undone.')) {
        localStorage.removeItem(SCOUTED_KEY);
        localStorage.setItem('ROBOT_COUNT', '0');
        setRobotCount(0);
        renderScoutedList();
    }
}

// ── Data QR ───────────────────────────────────────────────────────────────
function generateQR() {
    const teamNum   = document.getElementById('teamNum').value;
    const teamName  = TEAM_LIST[teamNum]?.name ?? "Unknown Team";
    const weightVal = parseFloat(document.getElementById('weight').value);
    const unit      = document.getElementById('weightUnit').value;
    const finalWeightLbs = unit === 'kg' ? (weightVal * 2.20462).toFixed(1) : weightVal;
    const turretType = document.querySelector('input[name="turretType"]:checked')?.value || 'None';
    const canDeg     = document.querySelector('input[name="canChangeDegree"]:checked')?.value || 'No';

    let turVals = `Type: ${turretType} | CanChangeDeg: ${canDeg}`;
    if (document.getElementById('yawTrigger').checked)
        turVals += ` | Yaw: ${document.getElementById('yawFreedomVal').value || '?'}°`;
    if (document.getElementById('pitchTrigger').checked)
        turVals += ` | Pitch: ${document.getElementById('pitchFreedomVal').value || '?'}°`;

    const climbLvl  = getMultiValues('climbLvl');
    const climbTime = document.getElementById('climbTime').value;

    const tsvValues = [
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

    document.getElementById('qrTeamText').innerText  = teamNum;
    document.getElementById('qrTeamName').innerText  = teamName;
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

    // Persist robot count
    incrementRobotCount();

    // Save scouted entry for teams list + CSV
    saveScoutedEntry({
        teamNum,
        teamName,
        eventKey:  EVENT_KEY,
        scouter:   document.getElementById('scouterName').value,
        chassis:   document.getElementById('chassis').value,
        weight:    `${finalWeightLbs} lbs`,
        capacity:  document.getElementById('capacity').value,
        intake:    getMultiValues('intake', 'intakeOtherVal'),
        visionHard: getMultiValues('visionHard', 'visOtherVal'),
        visionSoft: getMultiValues('visionSoft', 'visSoftOtherVal'),
        shoot:     getMultiValues('shoot'),
        turret:    turVals,
        startPos:  getMultiValues('startPos'),
        preload:   document.getElementById('preload').value,
        autoIntake: getMultiValues('autoIntakePos') || 'None',
        autoHang:  getMultiValues('autoHangPos') || 'None',
        autoTotal: document.getElementById('autoTotal').value,
        crossMid:  document.getElementById('crossMid').checked ? 'Yes' : 'No',
        terrain:   getMultiValues('terrain'),
        climbLvl,
        climbPos:  getMultiValues('climbPos'),
        climbTime: climbTime || 'N/A',
        photos:    document.getElementById('photosTaken').checked ? 'Yes' : 'No',
        notes:     document.getElementById('notes').value,
        timestamp: new Date().toLocaleString()
    });

    // Re-render scouted list on review page
    renderScoutedList();
}

// ── Path QR ───────────────────────────────────────────────────────────────
function generatePathQR() {
    if (strokes.length === 0) {
        alert("Please draw at least one path segment or place a dot.");
        return;
    }

    const teamNum   = document.getElementById('teamNum').value;
    const teamName  = TEAM_LIST[teamNum]?.name ?? "";
    const eventCode = EVENT_KEY.toUpperCase();
    const matchNum  = "0";

    document.getElementById('pathQrTeamText').innerText   = `Team ${teamNum}`;
    document.getElementById('pathQrHeader').style.display = "block";

    const qrContainer = document.getElementById('qrcodePath');
    qrContainer.innerHTML     = '';
    qrContainer.style.display = 'block';

    strokes.forEach((stroke, index) => {
        if (stroke.length < 1) return;

        const pathString = stroke.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
        const compressed = LZString.compressToBase64(
            [eventCode, matchNum, teamNum, pathString].join('\t')
        );

        const wrapper = document.createElement('div');
        wrapper.style.cssText = "margin-bottom:20px;padding:15px;background:#fff;border-radius:10px;color:#000;text-align:center;";

        const label      = document.createElement('div');
        const entryType  = stroke.length === 1 ? 'Position Dot' : `Auto Path #${index + 1}`;
        label.innerText  = `Team ${teamNum}${teamName ? ` (${teamName})` : ''}\n${entryType}`;
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

    const btn     = document.getElementById('generatePathBtn');
    btn.innerText = "Update Path QRs";
}

// ── Scouted Teams List (rendered on review page) ───────────────────────────
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
            <div class="scouted-badge">${e.chassis}</div>
        </div>
    `).join('');
}

// ── CSV Export ────────────────────────────────────────────────────────────
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
    ].map(v => (v === undefined || v === null) ? '' : v));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pit_scouting_${EVENT_KEY}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
