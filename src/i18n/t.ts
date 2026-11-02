import { MESSAGES } from './messages';

export type UiParams = Record<string, string | number>;

let currentLocale = 'zh-CN';

export function setUiLocale(locale: string | null | undefined): void {
    currentLocale = locale || 'zh-CN';
}

export function uiLocale(): string {
    return currentLocale;
}

export function t(id: string, params?: UiParams): string {
    if (!id) return id;
    const row = MESSAGES[id];
    const useEn = currentLocale.toLowerCase().startsWith('en');
    let out = row ? (useEn ? row.en || row.zh : row.zh) : id;
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            out = out.split(`{${key}}`).join(String(value));
        }
    }
    return out;
}
