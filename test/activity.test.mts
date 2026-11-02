import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pushActivity, ACTIVITY_LIMIT } from '../src/core/activity.ts';

test('ring buffer keeps last N newest-first', () => {
    let list = [];
    let nextId = 1;
    for (let i = 0; i < 25; i++) {
        const r = pushActivity(
            list,
            {
                at: i,
                kind: 'read_terminal',
                summary: 'r' + i,
            },
            nextId,
        );
        list = r.list;
        nextId = r.nextId;
    }
    assert.equal(list.length, ACTIVITY_LIMIT);
    assert.equal(list[0].summary, 'r24');
    assert.equal(list[ACTIVITY_LIMIT - 1].summary, 'r5');
});
