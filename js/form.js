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

// ── "Other" Conditional Inputs ─────────────────────────────────────────────
function setupOtherToggle(triggerId, boxId) {
    document.getElementById(triggerId).addEventListener('change', function(e) {
        const box = document.getElementById(boxId);
        if (e.target.checked) {
            box.style.display = 'block';
            box.querySelector('input').focus();
        } else {
            box.style.display = 'none';
            box.querySelector('input').value = '';
        }
    });
}

setupOtherToggle('intakeOtherTrigger', 'intakeOtherBox');
setupOtherToggle('visOtherTrigger',    'visOtherBox');
setupOtherToggle('visSoftOtherTrigger','visSoftOtherBox');
setupOtherToggle('yawTrigger',         'yawFreedomBox');
setupOtherToggle('pitchTrigger',       'pitchFreedomBox');

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
            selectEvent(ev.key);        // defined in tba.js
            eventSearchInput.value = '';
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
    const num       = this.value;
    const disp      = document.getElementById('teamNameDisplay');

    // Reset image UI and cancel pending fetches
    resetImageUI();                     // defined in tba.js
    clearTimeout(imageFetchTimeout);
    if (currentImageFetchController) {
        currentImageFetchController.abort();
        currentImageFetchController = null;
    }

    if (tbaStatus === "loaded") {
        if (TEAM_LIST[num]) {
            const team = TEAM_LIST[num];
            disp.innerHTML = `
                <div style="font-size:1.15rem;margin-bottom:4px;color:#000;">✓ ${team.name}</div>
                <div style="font-size:0.8rem;color:#333;font-weight:600;">📍 ${team.location}</div>
            `;
            disp.style.background = "var(--accent)";
            // Debounce — wait for user to finish typing before fetching image
            imageFetchTimeout = setTimeout(() => fetchRobotImage(num), 600);
        } else {
            disp.textContent      = num ? "Not in TBA Official List" : "Waiting for input...";
            disp.style.color      = num ? "var(--danger)" : "var(--accent)";
            disp.style.background = "rgba(255,255,255,0.05)";
        }
    } else if (tbaStatus === "loading") {
        disp.textContent      = "Fetching TBA Teams...";
        disp.style.color      = "var(--accent)";
        disp.style.background = "rgba(255,255,255,0.05)";
    } else if (tbaStatus === "empty") {
        disp.textContent      = num ? `Team ${num} (TBA list empty)` : "TBA has no teams yet";
        disp.style.color      = num ? "#000" : "var(--accent)";
        disp.style.background = num ? "var(--accent)" : "rgba(255,255,255,0.05)";
        if (num) imageFetchTimeout = setTimeout(() => fetchRobotImage(num), 600);
    } else {
        disp.textContent      = num ? `Team ${num} (Offline Mode)` : "API Error. Enter any team.";
        disp.style.color      = num ? "#000" : "var(--danger)";
        disp.style.background = num ? "var(--accent)" : "rgba(255,68,68,0.1)";
    }

    updateNavButtons();
});

// Monitor other inputs for live validation
['scouterName','notes','weight','capacity','preload','autoTotal',
 'climbTime','intakeOtherVal','visOtherVal','visSoftOtherVal',
 'turretCount','yawFreedomVal','pitchFreedomVal'
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
            document.getElementById('profanity-name').style.display = 'none';
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
        const weightVal = document.getElementById('weight').value;
        const capVal    = document.getElementById('capacity').value;
        const unit      = document.getElementById('weightUnit').value;
        const weightLbs = unit === 'kg' ? parseFloat(weightVal) * 2.20462 : parseFloat(weightVal);

        if (!weightVal || !capVal) { isValid = false; }
        else if (weightLbs > 135) {
            document.getElementById('err-weight').style.display = 'block';
            document.getElementById('weight').classList.add('violation');
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
        const capacity     = parseFloat(document.getElementById('capacity').value) || 0;
        const errEl        = document.getElementById('err-preload');

        if (!preloadVal || !autoTotalVal) { isValid = false; }
        else if (preload > 8) {
            errEl.innerText = "Max Preload is 8";
            errEl.style.display = 'block';
            document.getElementById('preload').classList.add('violation');
            isValid = false;
        } else if (preload > capacity) {
            errEl.innerText = `Preload > Capacity (${capacity})`;
            errEl.style.display = 'block';
            document.getElementById('preload').classList.add('violation');
            isValid = false;
        } else {
            errEl.style.display = 'none';
            document.getElementById('preload').classList.remove('violation');
        }
    }
    else if (currentPage === 3) {
        const notes = document.getElementById('notes').value;
        if (!document.getElementById('climbTime').value) isValid = false;

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

function navigate(dir) {
    if (dir === 1 && document.getElementById('nextBtn').disabled) return;

    document.getElementById(`page${currentPage}`).classList.remove('active');
    currentPage += dir;
    document.getElementById(`page${currentPage}`).classList.add('active');

    document.getElementById('backBtn').style.visibility = currentPage === 0 ? 'hidden' : 'visible';

    if (currentPage === 4) {
        document.getElementById('nextBtn').style.display = 'none';
        prepareReview();
    } else if (currentPage === 5) {
        document.getElementById('nextBtn').style.display = 'none';
        initCanvas();           // defined in canvas.js
    } else {
        document.getElementById('nextBtn').style.display = 'block';
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
    const t    = document.getElementById('teamNum').value;
    const name = TEAM_LIST[t]?.name ?? "Unknown";
    let html   = `<strong>Team ${t} - ${name}</strong><br>`;
    html += `Event: ${EVENT_KEY}<br>`;
    html += `Scouter: ${document.getElementById('scouterName').value}<br>`;
    html += `<hr style="border-color:#333;margin:5px 0;">`;
    html += `Chassis: ${document.getElementById('chassis').value}<br>`;
    html += `Auto Intake: ${getMultiValues('autoIntakePos') || 'None'}<br>`;
    html += `Auto Hang: ${getMultiValues('autoHangPos') || 'None'}<br>`;
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

    resetImageUI();
    clearTimeout(imageFetchTimeout);
    if (currentImageFetchController) {
        currentImageFetchController.abort();
        currentImageFetchController = null;
    }

    document.getElementById('qrHeader').style.display     = 'none';
    document.getElementById('pathQrHeader').style.display  = 'none';
    document.querySelectorAll('.error-msg').forEach(el    => el.style.display = 'none');
    document.querySelectorAll('.profanity-alert').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.violation').forEach(el    => el.classList.remove('violation'));

    document.getElementById('qrcode').innerHTML     = '';
    document.getElementById('qrcode').style.display = 'none';
    document.getElementById('qrcodePath').innerHTML     = '';
    document.getElementById('qrcodePath').style.display = 'none';

    document.getElementById('generateBtn').style.display  = 'inline-block';
    document.getElementById('goToPathBtn').style.display  = 'none';
    const pathBtn = document.getElementById('generatePathBtn');
    pathBtn.style.display = 'inline-block';
    pathBtn.innerText     = 'Generate Path QRs';

    strokes = []; currentStroke = [];    // defined in canvas.js

    document.querySelector('.page.active').classList.remove('active');
    currentPage = 0;
    document.getElementById('page0').classList.add('active');
    document.getElementById('backBtn').style.visibility = 'hidden';
    document.getElementById('nextBtn').style.display    = 'block';

    document.getElementById('teamNum').dispatchEvent(new Event('input'));
    updateNavButtons();
    window.scrollTo(0, 0);
}

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById('backBtn').style.visibility = 'hidden';
updateNavButtons();
