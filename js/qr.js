/* =========================================
   qr.js — QR Code Generation
   Data QR (Step 6) and Path QR (Step 7)
========================================= */

// ── Data QR ───────────────────────────────────────────────────────────────
function generateQR() {
    const teamNum  = document.getElementById('teamNum').value;
    const teamName = TEAM_LIST[teamNum]?.name ?? "Unknown Team";
    const weightVal = parseFloat(document.getElementById('weight').value);
    const unit      = document.getElementById('weightUnit').value;
    const finalWeightLbs = unit === 'kg' ? (weightVal * 2.20462).toFixed(1) : weightVal;

    const tCount = document.getElementById('turretCount').value || "0";
    let turVals  = `Count: ${tCount}`;
    if (document.getElementById('yawTrigger').checked)
        turVals += ` | Yaw: ${document.getElementById('yawFreedomVal').value || 'Yes'}`;
    if (document.getElementById('pitchTrigger').checked)
        turVals += ` | Pitch: ${document.getElementById('pitchFreedomVal').value || 'Yes'}`;

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
        getMultiValues('climbLvl'),
        getMultiValues('climbPos'),
        document.getElementById('climbTime').value,
        document.getElementById('photosTaken').checked ? 1 : 0,
        document.getElementById('notes').value.replace(/[\t\n]/g, ' ')
    ];

    const compressed = LZString.compressToBase64(tsvValues.join('\t'));

    document.getElementById('qrTeamText').innerText = teamNum;
    document.getElementById('qrTeamName').innerText = teamName;
    document.getElementById('qrHeader').style.display = "block";

    const qrEl = document.getElementById('qrcode');
    qrEl.innerHTML     = '';
    qrEl.style.display = 'block';

    new QRCode(qrEl, {
        text: compressed, width: 256, height: 256,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });

    document.getElementById('generateBtn').style.display  = 'none';
    document.getElementById('goToPathBtn').style.display  = 'inline-block';

    // Increment robot counter in header
    const badge = document.getElementById('robotCounter');
    const count = parseInt(badge.innerText.split(': ')[1]) + 1;
    badge.innerText = "ROBOTS: " + count;
}

// ── Path QR ───────────────────────────────────────────────────────────────
function generatePathQR() {
    if (strokes.length === 0) {
        alert("Please draw at least one path segment.");
        return;
    }

    const teamNum  = document.getElementById('teamNum').value;
    const teamName = TEAM_LIST[teamNum]?.name ?? "";
    const eventCode = EVENT_KEY.toUpperCase();
    const matchNum  = "0";

    document.getElementById('pathQrTeamText').innerText     = `Team ${teamNum}`;
    document.getElementById('pathQrHeader').style.display   = "block";

    const qrContainer = document.getElementById('qrcodePath');
    qrContainer.innerHTML     = '';
    qrContainer.style.display = 'block';

    strokes.forEach((stroke, index) => {
        if (stroke.length < 2) return;

        const pathString = stroke.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
        const compressed = LZString.compressToBase64(
            [eventCode, matchNum, teamNum, pathString].join('\t')
        );

        const wrapper = document.createElement('div');
        wrapper.style.cssText = "margin-bottom:20px;padding:15px;background:#fff;border-radius:10px;color:#000;text-align:center;";

        const label = document.createElement('div');
        label.innerText = `Team ${teamNum}${teamName ? ` (${teamName})` : ''}\nAuto Path #${index + 1}`;
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
