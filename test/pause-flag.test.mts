import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tabby-mcp-pause-'));
const prevApp = process.env.APPDATA;
const prevXdg = process.env.XDG_CONFIG_HOME;
process.env.APPDATA = tmp;
process.env.XDG_CONFIG_HOME = tmp;

const { getPauseFlagPath, isPaused, setPaused, clearPauseOnStartup } =
    await import('../src/core/pause-flag.ts');

test('pause flag roundtrip and clear on startup', () => {
    clearPauseOnStartup();
    assert.equal(isPaused(), false);
    setPaused(true);
    assert.equal(isPaused(), true);
    assert.ok(fs.existsSync(getPauseFlagPath()));
    clearPauseOnStartup();
    assert.equal(isPaused(), false);
    setPaused(true);
    setPaused(false);
    assert.equal(isPaused(), false);
});

test('cleanup env', () => {
    if (prevApp === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = prevApp;
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prevXdg;
    fs.rmSync(tmp, { recursive: true, force: true });
});
