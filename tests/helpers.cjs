const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadApp(root = path.join(__dirname, '..')) {
    const elements = new Map();
    const groups = new Map();
    const storage = new Map();
    const qrCodes = [];
    let downloadedBlob;
    let downloadName;

    function element() {
        const listeners = new Map();
        return {
            value: '', checked: false, innerHTML: '', innerText: '', textContent: '',
            style: {}, children: [], options: [], dataset: {},
            clientWidth: 400, clientHeight: 200,
            classList: { add() {}, remove() {} },
            addEventListener(type, callback) { listeners.set(type, callback); },
            dispatchEvent(event) { listeners.get(event.type)?.call(this, { ...event, target: this }); },
            appendChild(child) { this.children.push(child); },
            getContext() { return new Proxy({}, { get: () => () => {} }); },
            getBoundingClientRect() { return { left: 0, top: 0 }; },
            click() { downloadName = this.download; },
            scrollIntoView() {}, focus() {},
        };
    }

    function get(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    }

    function queryAll(selector) {
        const match = selector.match(/^input\[name="([^"]+)"\](:checked)?$/);
        if (!match) return [];
        const inputs = groups.get(match[1]) || [];
        return match[2] ? inputs.filter(input => input.checked) : inputs;
    }

    const document = {
        getElementById: get,
        createElement: element,
        querySelectorAll: queryAll,
        querySelector(selector) { return queryAll(selector)[0] || null; },
        getElementsByName(name) { return groups.get(name) || []; },
        addEventListener() {}, body: { style: {} },
    };
    class TestURL extends URL {
        static createObjectURL(blob) { downloadedBlob = blob; return 'blob:test'; }
        static revokeObjectURL() {}
    }
    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : ['2026-03-01T12:00:00Z'])); }
        toLocaleString() { return '3/1/2026, 12:00:00 PM'; }
    }
    function QRCode(target, options) { qrCodes.push(options); }
    QRCode.CorrectLevel = { L: 1 };

    const context = vm.createContext({
        document, console, URL: TestURL, Blob, Date: FixedDate, QRCode,
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key),
        },
        // Capture the exact input to the unchanged LZString library.
        LZString: { compressToBase64: text => text },
        window: { addEventListener() {}, scrollTo() {} },
        setInterval() {}, setTimeout() {}, clearTimeout() {},
        AbortController, fetch: () => new Promise(() => {}),
        alert() {}, confirm: () => true, Event: class { constructor(type) { this.type = type; } },
    });
    for (const name of ['tba', 'canvas', 'qr', 'form']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
    }
    return {
        context, get, storage, qrCodes,
        run: code => vm.runInContext(code, context),
        setGroup(name, values) {
            groups.set(name, values.map(value => ({ id: '', value, checked: true })));
        },
        get downloadedBlob() { return downloadedBlob; },
        get downloadName() { return downloadName; },
    };
}

function populateScout(app, unit = 'kg') {
    // Synthetic records for compatibility checks; no real scouting data.
    const values = {
        teamNum: '1234', scouterName: 'Test Scout 測試', chassis: 'Swerve',
        weight: unit === 'kg' ? '55' : '125', weightUnit: unit, capacity: '30',
        preload: '8', autoTotal: '24', climbTime: '5', yawFreedomVal: '360',
        pitchFreedomVal: '45', notes: 'Reliable & fast; <literal> "notes"\twith\nnewlines',
    };
    for (const [id, value] of Object.entries(values)) app.get(id).value = value;
    for (const id of ['crossMid', 'photosTaken', 'yawTrigger', 'pitchTrigger']) app.get(id).checked = true;
    const choices = {
        turretType: ['Single'], canChangeDegree: ['Yes'], intake: ['Ground', 'Outpost'],
        visionHard: ['Limelight'], visionSoft: ['AprilTag'], shoot: ['Stationary', 'Pass'],
        startPos: ['Left'], autoIntakePos: ['Depot'], autoHangPos: ['Center'],
        terrain: ['Bump', 'Trench'], climbLvl: ['L2'], climbPos: ['FarLeft'],
    };
    for (const [name, values] of Object.entries(choices)) app.setGroup(name, values);
    app.run('TEAM_LIST = {1234: {name: "Fixture Team & Robot", location: "Test Location"}}; EVENT_KEY = "2026test";');
}

async function outputSnapshot(app, unit = 'kg') {
    populateScout(app, unit);
    app.context.generateQR();
    app.context.exportCSV();
    app.run('strokes = [[{x: 10.2, y: 20.4}, {x: 25, y: 20}, {x: 50.5, y: 60.6}], [{x: 30.4, y: 40.6}]];');
    app.context.generatePathQR();
    return {
        qrCodes: app.qrCodes,
        savedEntries: JSON.parse(app.storage.get('SCOUTED_TEAMS_2026_V1')),
        robotCount: app.storage.get('ROBOT_COUNT'),
        csv: await app.downloadedBlob.text(), filename: app.downloadName,
    };
}

module.exports = { loadApp, populateScout, outputSnapshot };
