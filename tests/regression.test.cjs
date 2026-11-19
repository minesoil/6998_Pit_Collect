const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadApp, populateScout, outputSnapshot } = require('./helpers.cjs');
// Captured from legacy commit 4fdad75 before the presentation and DOM safety edits.
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-outputs.json'), 'utf8'));

test('data QR, path QR, saved entries, and CSV match the legacy outputs', async () => {
    for (const unit of ['kg', 'lbs']) {
        const actual = await outputSnapshot(loadApp(), unit);
        assert.deepEqual(JSON.parse(JSON.stringify(actual)), fixture[unit]);
    }
});

test('review and saved quick view render free text literally without changing it', () => {
    const app = loadApp();
    populateScout(app);
    const text = `<img src=x onerror="alert(1)"> & '機器人'`;
    app.get('notes').value = text;
    app.context.prepareReview();
    app.context.generateQR();
    app.context.openQuickView('1234');
    for (const id of ['reviewText', 'quickViewContent']) {
        const html = app.get(id).innerHTML;
        assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;機器人&#39;'));
        assert.ok(!html.includes('<img'));
    }
    assert.equal(JSON.parse(app.storage.get('SCOUTED_TEAMS_2026_V1'))[0].notes, text);
    assert.ok(app.qrCodes[0].text.endsWith(text));
});

test('saved team identifiers remain data rather than handler code', () => {
    const app = loadApp();
    const teamNum = `1234');alert(1);//"`;
    const name = '<img src=x onerror=alert(1)>';
    app.storage.set('SCOUTED_TEAMS_2026_V1', JSON.stringify([{ teamNum, teamName: name, eventKey: '2026dal', scouter: name }]));
    app.context.renderScoutedList();
    const saved = app.get('scoutedListContainer').innerHTML;
    assert.ok(saved.includes('onclick="openQuickView(this.dataset.teamNum)"'));
    assert.ok(saved.includes('onclick="editEntry(this.dataset.teamNum)"'));
    assert.ok(saved.includes('data-team-num="1234&#39;);alert(1);//&quot;"'));
    assert.ok(!saved.includes('<img'));
});

test('event search and team identity escape external names', () => {
    const app = loadApp();
    app.run(`EVENTS_DATA = {event: {name: '<img src=x> Event', key: 'event', city: '<b>City</b>'}};`);
    app.get('eventSearch').value = 'event';
    app.get('eventSearch').dispatchEvent({ type: 'input' });
    assert.ok(app.get('eventDropdown').children[0].innerHTML.includes('&lt;img src=x&gt;'));
    app.run(`TEAM_LIST = {1234: {name: '<img src=x>', location: '<b>Test Location</b>'}}; tbaStatus = 'loaded'; fetchTeamTBADetail = () => {};`);
    app.get('teamNum').value = '1234';
    app.get('teamNum').dispatchEvent({ type: 'input' });
    const html = app.get('teamNameDisplay').innerHTML;
    assert.ok(html.includes('&lt;img src=x&gt;'));
    assert.ok(html.includes('&lt;b&gt;Test Location&lt;/b&gt;'));
    assert.ok(!html.includes('<img'));
});
