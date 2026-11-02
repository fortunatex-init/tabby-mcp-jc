const NEWLINES = /[\r\n]/g;

const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export interface SanitizeResult {
    text: string;
    modified: boolean;
    removed: string[];
}

export function sanitizeCommandText(input: string): SanitizeResult {
    const removed: string[] = [];

    let text = input;
    if (NEWLINES.test(text)) {
        removed.push('newline');
    }
    NEWLINES.lastIndex = 0;
    text = text.replace(NEWLINES, '');

    if (CONTROL.test(text)) {
        removed.push('control');
    }
    CONTROL.lastIndex = 0;
    text = text.replace(CONTROL, '');

    return { text, modified: text !== input, removed };
}

export function assertNoSubmit(text: string): void {
    if (/[\r\n]/.test(text)) {
        throw new Error(
            'refusing to send text containing a newline — this would submit the command',
        );
    }
}
