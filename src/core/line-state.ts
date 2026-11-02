export type LineOrigin = 'user' | 'ai';
export type PendingReason = 'user_typing' | 'ai_unsubmitted' | 'ime_composing';

export interface InputEffect {
    reset: boolean;
    dirtyTail: boolean;
}

const ESC = '\x1b';
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

function isAutoReply(params: string, final: string): boolean {
    if ('Rncty'.includes(final)) {
        return true;
    }
    if ((final === 'I' || final === 'O') && params === '') {
        return true;
    }
    return final === 'M' || final === 'm';
}

export function classifyInput(data: string): InputEffect {
    let reset = false;
    let dirtyTail = false;

    for (let i = 0; i < data.length;) {
        const c = data[i];

        if (data.startsWith(PASTE_START, i)) {
            const end = data.indexOf(PASTE_END, i + PASTE_START.length);
            dirtyTail = true;
            i = end < 0 ? data.length : end + PASTE_END.length;
            continue;
        }

        if (c === '\r' || c === '\n' || c === '\x03') {
            reset = true;
            dirtyTail = false;
            i++;
            continue;
        }

        if (c === ESC) {
            const kind = data[i + 1];
            if (kind === '[' && data[i + 2] === 'M' && i + 5 < data.length) {
                i += 6;
                continue;
            }
            if (kind === '[') {
                const m = /^\[([0-?]*)[ -/]*([@-~])/.exec(data.slice(i + 1));
                if (m) {
                    if (!isAutoReply(m[1], m[2])) {
                        dirtyTail = true;
                    }
                    i += 1 + m[0].length;
                    continue;
                }
            }
            if (kind === ']' || kind === 'P' || kind === '_' || kind === '^') {
                const rest = data.slice(i + 2);
                const bel = rest.indexOf('\x07');
                const st = rest.indexOf(`${ESC}\\`);
                const ends = [bel < 0 ? -1 : bel + 1, st < 0 ? -1 : st + 2].filter(n => n > 0);
                if (ends.length) {
                    i += 2 + Math.min(...ends);
                    continue;
                }
            }
            dirtyTail = true;
            i += kind === undefined ? 1 : 2;
            continue;
        }

        dirtyTail = true;
        i++;
    }

    return { reset, dirtyTail };
}

export interface LineSignature {
    left: string;
    right: string;
}

export interface BufferLike {
    baseY: number;
    cursorY: number;
    cursorX: number;
    getLine(y: number):
        | {
              isWrapped: boolean;
              translateToString(
                  trimRight?: boolean,
                  startColumn?: number,
                  endColumn?: number,
              ): string;
          }
        | undefined;
}

const MAX_WRAPPED_ROWS = 64;

export function readLineSignature(buf: BufferLike): LineSignature | null {
    const y = buf.baseY + buf.cursorY;
    const line = buf.getLine(y);
    if (!line) {
        return null;
    }

    let left = line.translateToString(false, 0, buf.cursorX);
    for (let row = y, n = 0; n < MAX_WRAPPED_ROWS && buf.getLine(row)?.isWrapped; row--, n++) {
        const prev = buf.getLine(row - 1);
        if (!prev) {
            break;
        }
        left = prev.translateToString(false) + left;
    }

    let right = line.translateToString(true, buf.cursorX);
    for (let row = y + 1, n = 0; n < MAX_WRAPPED_ROWS; row++, n++) {
        const next = buf.getLine(row);
        if (!next?.isWrapped) {
            break;
        }
        right += next.translateToString(true);
    }

    return { left: left.trimEnd(), right: right.trimEnd() };
}

export class LineTracker {
    status: 'clean' | 'dirty' = 'clean';

    origin: LineOrigin = 'user';

    baseline: LineSignature | null = null;

    composing = false;

    seq = 0;
    inputSeq = 0;
    outputSeq = 0;

    recordInput(
        effect: InputEffect,
        origin: LineOrigin,
        snapshot: () => LineSignature | null,
    ): void {
        if (effect.reset) {
            this.reset();
        }
        if (!effect.dirtyTail) {
            return;
        }
        if (this.status === 'clean') {
            this.status = 'dirty';
            this.origin = origin;
            this.baseline = snapshot();
        } else if (origin === 'user') {
            this.origin = 'user';
        }
        this.inputSeq = ++this.seq;
    }

    recordOutput(): void {
        this.outputSeq = ++this.seq;
    }

    reset(): void {
        this.status = 'clean';
        this.origin = 'user';
        this.baseline = null;
    }

    judge(current: LineSignature | null): PendingReason | null {
        if (this.composing) {
            return 'ime_composing';
        }
        if (this.status === 'clean') {
            return null;
        }

        const reason: PendingReason = this.origin === 'ai' ? 'ai_unsubmitted' : 'user_typing';
        if (this.outputSeq < this.inputSeq) {
            return reason;
        }
        if (
            current &&
            this.baseline &&
            current.left === this.baseline.left &&
            current.right === this.baseline.right
        ) {
            this.reset();
            return null;
        }
        return reason;
    }
}

export function describePending(
    tabId: string,
    reason: PendingReason,
    afterConfirm: boolean,
): string {
    let msg: string;
    if (reason === 'ime_composing') {
        msg = `用户正在标签页 ${tabId} 里用输入法打字,这次没有写入。请告诉用户打完或取消后再让你重试,不要自己反复重试。`;
    } else if (reason === 'ai_unsubmitted') {
        msg =
            `你上一次用 write_terminal 写入标签页 ${tabId} 的命令还在命令行上,用户没有按回车,也没有清空。` +
            '再写会直接拼接在它后面,所以这次没有写入。请让用户按回车执行上一条,或者清空这一行后再让你重试;' +
            '你没有办法替用户删字,不要为了覆盖上一条而连续调用。';
    } else {
        msg =
            `标签页 ${tabId} 的命令行上有用户还没提交的输入(可能正打到一半)。` +
            '为了不把命令拼接到用户的输入后面,这次没有写入。请告诉用户先按回车执行,或者清空这一行' +
            '(PowerShell/cmd 按 Esc,bash/zsh 按 Ctrl+U,或者按 Ctrl+C),然后再让你重试。不要自己反复重试。';
    }
    if (afterConfirm) {
        msg +=
            '(用户在确认框里已经同意了这条命令,但写入前发现命令行上有内容;重试时会重新弹确认框。)';
    }
    return msg;
}
