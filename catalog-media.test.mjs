import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindCatalogMedia, shouldPlayVideo } from './catalog-media.mjs';

test('requires an explicit opt-in, visible video, and visible tab', () => {
    const active = { enabled: true, tabHidden: false, inView: true };
    assert.equal(shouldPlayVideo(active), true);
    assert.equal(shouldPlayVideo({ ...active, enabled: false }), false);
    assert.equal(shouldPlayVideo({ ...active, inView: false }), false);
    assert.equal(shouldPlayVideo({ ...active, tabHidden: true }), false);
});

test('does not autoplay, pauses on visibility changes, and lets the reader disable playback', async () => {
    function target() {
        const events = new Map();
        return {
            addEventListener: (event, handler) => events.set(event, handler),
            emit: event => events.get(event)?.(),
            setAttribute() {},
            removeAttribute() {},
        };
    }
    const toggle = target();
    const status = target();
    let plays = 0;
    const video = {
        ...target(),
        paused: true,
        async play() { this.paused = false; plays++; },
        pause() { this.paused = true; },
    };
    const document = {
        ...target(),
        hidden: false,
        getElementById: id => id.endsWith('toggle') ? toggle : status,
        querySelectorAll: () => [video],
    };
    bindCatalogMedia(document, null);
    assert.equal(plays, 0);
    toggle.emit('click');
    await Promise.resolve();
    assert.equal(plays, 1);
    document.hidden = true;
    document.emit('visibilitychange');
    assert.equal(video.paused, true);
    document.hidden = false;
    document.emit('visibilitychange');
    await Promise.resolve();
    assert.equal(plays, 2);
    toggle.emit('click');
    assert.equal(video.paused, true);
});
