export function maskToken(token: string): string {
    const t = (token || '').trim();
    if (!t) return '(空)';
    if (t.length <= 8) return '*'.repeat(t.length);
    return t.slice(0, 4) + '…' + t.slice(-4);
}

export function tokenFingerprint(token: string): string {
    const t = (token || '').trim();
    if (!t) return 'empty';
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) {
        h ^= t.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}
