import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    classifyInput,
    describePending,
    LineTracker,
    readLineSignature,
} from '../src/core/line-state.ts';
import type { LineSignature } from '../src/core/line-state.ts';

test('回车、换行、Ctrl+C 算提交', () => {
    for (const data of ['\r', '\n', '\x03']) {
        assert.deepEqual(
            classifyInput(data),
            { reset: true, dirtyTail: false },
            JSON.stringify(data),
        );
    }
});

test('可打印字符、方向键、Esc、退格都算脏', () => {
    for (const data of ['a', '中', '\x1b[A', '\x1b', '\x7f', '\t', '\x15', '\x1bOA']) {
        assert.equal(classifyInput(data).dirtyTail, true, JSON.stringify(data));
    }
});

test('同一批里以最后一次提交之后为准', () => {
    assert.deepEqual(classifyInput('ls\r'), { reset: true, dirtyTail: false });
    assert.deepEqual(classifyInput('ls\rpwd'), { reset: true, dirtyTail: true });
});

test('括号粘贴里的换行不算提交', () => {
    assert.deepEqual(classifyInput('\x1b[200~git co\r\x1b[201~'), {
        reset: false,
        dirtyTail: true,
    });
});

test('终端自动应答不改变输入行状态', () => {
    for (const data of [
        '\x1b[12;40R',
        '\x1b[0n',
        '\x1b[?1;2c',
        '\x1b[I',
        '\x1b[O',
        '\x1b[<0;10;5M',
        '\x1b[M !!',
        '\x1b]11;rgb:0000/0000/0000\x07',
        '\x1b]10;rgb:ffff/ffff/ffff\x1b\\',
    ]) {
        assert.deepEqual(
            classifyInput(data),
            { reset: false, dirtyTail: false },
            JSON.stringify(data),
        );
    }
});

const PROMPT: LineSignature = { left: 'PS C:\\>', right: '' };
const typed = (text: string): LineSignature => ({ left: `PS C:\\> ${text}`, right: '' });

function dirtyTracker(origin: 'user' | 'ai' = 'user'): LineTracker {
    const t = new LineTracker();
    t.recordInput(classifyInput('g'), origin, () => PROMPT);
    return t;
}

test('干净的行可以写', () => {
    assert.equal(new LineTracker().judge(PROMPT), null);
});

test('用户敲了半截 —— 拒绝', () => {
    const t = dirtyTracker();
    t.recordOutput();
    assert.equal(t.judge(typed('git co')), 'user_typing');
});

test('回显还没到 —— 即使缓冲看起来是空行也拒绝', () => {
    const t = dirtyTracker();
    assert.equal(t.judge(PROMPT), 'user_typing');
});

test('用户删光了(行回到提示符原样)—— 放行并复位', () => {
    const t = dirtyTracker();
    t.recordOutput();
    assert.equal(t.judge(PROMPT), null);
    assert.equal(t.status, 'clean');
});

test('按了回车 —— 复位', () => {
    const t = dirtyTracker();
    t.recordInput(classifyInput('\r'), 'user', () => null);
    assert.equal(t.judge(typed('随便什么输出')), null);
});

test('AI 上次写入的还没执行 —— 拒绝,原因是 ai_unsubmitted', () => {
    const t = dirtyTracker('ai');
    t.recordOutput();
    assert.equal(t.judge(typed('ls')), 'ai_unsubmitted');
});

test('AI 写完之后用户又动过 —— 算用户的', () => {
    const t = dirtyTracker('ai');
    t.recordInput(classifyInput('x'), 'user', () => null);
    t.recordOutput();
    assert.equal(t.judge(typed('lsx')), 'user_typing');
});

test('baseline 只在干净变脏时拍一次', () => {
    const t = new LineTracker();
    let shots = 0;
    const snap = () => {
        shots++;
        return PROMPT;
    };
    t.recordInput(classifyInput('g'), 'user', snap);
    t.recordInput(classifyInput('i'), 'user', snap);
    t.recordInput(classifyInput('t'), 'user', snap);
    assert.equal(shots, 1);
});

test('读不到缓冲时,脏行一律拒绝', () => {
    const t = new LineTracker();
    t.recordInput(classifyInput('g'), 'user', () => null);
    t.recordOutput();
    assert.equal(t.judge(null), 'user_typing');
    assert.equal(t.judge(PROMPT), 'user_typing');
});

test('输入法组字中 —— 即使行是干净的也拒绝', () => {
    const t = new LineTracker();
    t.composing = true;
    assert.equal(t.judge(PROMPT), 'ime_composing');
});

test('光标挪到行首,右边还有内容 —— 拒绝', () => {
    const t = dirtyTracker();
    t.recordOutput();
    assert.equal(t.judge({ left: 'PS C:\\>', right: 'git co' }), 'user_typing');
});

function fakeBuffer(
    rows: Array<{ text: string; wrapped?: boolean }>,
    cursorY: number,
    cursorX: number,
) {
    return {
        baseY: 0,
        cursorY,
        cursorX,
        getLine: (y: number) => {
            const row = rows[y];
            if (!row) {
                return undefined;
            }
            return {
                isWrapped: !!row.wrapped,
                translateToString: (trimRight = false, start = 0, end = row.text.length) => {
                    const s = row.text.slice(start, end);
                    return trimRight ? s.trimEnd() : s;
                },
            };
        },
    };
}

test('签名以光标为界分左右,并去掉尾部空白', () => {
    const buf = fakeBuffer([{ text: 'PS C:\\> git co      ' }], 0, 8);
    assert.deepEqual(readLineSignature(buf), { left: 'PS C:\\>', right: 'git co' });
});

test('签名沿软换行拼接整条逻辑行', () => {
    const buf = fakeBuffer(
        [
            { text: 'PS C:\\> aaaa' },
            { text: 'bbbb', wrapped: true },
            { text: 'cc  ', wrapped: true },
            { text: 'next line' },
        ],
        1,
        2,
    );
    assert.deepEqual(readLineSignature(buf), { left: 'PS C:\\> aaaabb', right: 'bbcc' });
});

test('光标行不存在时返回 null', () => {
    assert.equal(readLineSignature(fakeBuffer([], 3, 0)), null);
});

test('拒绝理由里带错误语义,不带行内容', () => {
    for (const reason of ['user_typing', 'ai_unsubmitted', 'ime_composing'] as const) {
        const msg = describePending('tab-3', reason, false);
        assert.ok(msg.includes('tab-3'));
        assert.ok(msg.includes('没有写入'));
    }
    assert.ok(describePending('tab-3', 'user_typing', true).includes('确认框'));
});
