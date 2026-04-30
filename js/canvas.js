/* =========================================
   canvas.js — Auto Path Drawing (Step 7)
========================================= */

const canvas = document.getElementById('fieldCanvas');
const ctx    = canvas.getContext('2d');

let isDrawing     = false;
let strokes       = [];
let currentStroke = [];
let drawingMode   = 'line';

const PATH_COLORS = ["#00C851", "#33b5e5", "#ff4444", "#ffbb33", "#aa66cc"];

function toggleDrawMode() {
    drawingMode = drawingMode === 'line' ? 'dot' : 'line';
    document.getElementById('modeText').innerText =
        drawingMode === 'line' ? 'Drawing Line' : 'Placing Dot';
    document.getElementById('toggleModeBtn').innerText =
        drawingMode === 'line' ? '📍 Switch to Dot' : '✏️ Switch to Line';
}

function initCanvas() {
    const container = document.getElementById('fieldContainer');
    const savedStrokes = strokes.slice();
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    strokes = savedStrokes;
    redraw();
}

window.addEventListener('resize', () => {
    if (currentPage === 5) initCanvas();
});

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach((stroke, index) => {
        const color = PATH_COLORS[index % PATH_COLORS.length];

        if (stroke.length === 1) {
            const x = pctToX(stroke[0].x);
            const y = pctToY(stroke[0].y);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();

        } else if (stroke.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.lineWidth   = 6;
            ctx.moveTo(pctToX(stroke[0].x) + 2, pctToY(stroke[0].y) + 2);
            for (let i = 1; i < stroke.length; i++)
                ctx.lineTo(pctToX(stroke[i].x) + 2, pctToY(stroke[i].y) + 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth   = 3;
            ctx.moveTo(pctToX(stroke[0].x), pctToY(stroke[0].y));
            for (let i = 1; i < stroke.length; i++)
                ctx.lineTo(pctToX(stroke[i].x), pctToY(stroke[i].y));
            ctx.stroke();

            ctx.fillStyle = "#00C851";
            ctx.beginPath();
            ctx.arc(pctToX(stroke[0].x), pctToY(stroke[0].y), 6, 0, Math.PI * 2);
            ctx.fill();

            const last = stroke[stroke.length - 1];
            ctx.fillStyle = "#ff4444";
            ctx.beginPath();
            ctx.arc(pctToX(last.x), pctToY(last.y), 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle   = "white";
            ctx.font        = "bold 13px Lexend, sans-serif";
            ctx.fillText(`#${index + 1}`, pctToX(stroke[0].x) + 9, pctToY(stroke[0].y) - 9);
        }
    });

    if (currentStroke.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = PATH_COLORS[strokes.length % PATH_COLORS.length];
        ctx.lineWidth   = 2;
        ctx.moveTo(pctToX(currentStroke[0].x), pctToY(currentStroke[0].y));
        for (let i = 1; i < currentStroke.length; i++)
            ctx.lineTo(pctToX(currentStroke[i].x), pctToY(currentStroke[i].y));
        ctx.stroke();
    }
}

function pctToX(pct) { return (pct / 100) * canvas.width;  }
function pctToY(pct) { return (pct / 100) * canvas.height; }

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.changedTouches ? e.changedTouches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function startDraw(e) {
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);

    if (drawingMode === 'dot') {
        strokes.push([{ x: toXPct(pos.x), y: toYPct(pos.y) }]);
        redraw();
    } else {
        isDrawing     = true;
        currentStroke = [];
        addPoint(pos.x, pos.y);
    }
}

function draw(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    addPoint(pos.x, pos.y);
    redraw();
}

function endDraw(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    isDrawing = false;
    if (currentStroke.length > 0) {
        strokes.push(currentStroke);
        currentStroke = [];
    }
    redraw();
}

function addPoint(pixelX, pixelY) {
    const xPct = toXPct(pixelX);
    const yPct = toYPct(pixelY);
    if (currentStroke.length > 0) {
        const last = currentStroke[currentStroke.length - 1];
        if (Math.hypot(xPct - last.x, yPct - last.y) < 4.0) return; // Increased to 8.0 for fewer points per stroke
    }
    currentStroke.push({ x: xPct, y: yPct });
}

function toXPct(px) { return parseFloat((px / canvas.width  * 100).toFixed(1)); }
function toYPct(py) { return parseFloat((py / canvas.height * 100).toFixed(1)); }

function clearCanvas() {
    strokes = []; currentStroke = [];
    redraw();
    document.getElementById('qrcodePath').innerHTML      = '';
    document.getElementById('qrcodePath').style.display  = 'none';
    document.getElementById('pathQrHeader').style.display = 'none';
    const btn     = document.getElementById('generatePathBtn');
    btn.innerText = 'Generate Path QRs';
}

function undoLastStroke() {
    strokes.pop();
    redraw();
}

canvas.addEventListener('mousedown',  startDraw);
canvas.addEventListener('mousemove',  draw);
canvas.addEventListener('mouseup',    endDraw);
canvas.addEventListener('mouseout',   endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove',  draw,      { passive: false });
canvas.addEventListener('touchend',   endDraw,   { passive: false });
