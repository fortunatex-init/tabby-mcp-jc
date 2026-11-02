export type ClientInfoLike =
    | {
          name?: unknown;
          version?: unknown;
      }
    | null
    | undefined;

export function callerLabel(clientInfo: ClientInfoLike): string {
    const name = typeof clientInfo?.name === 'string' ? clientInfo.name.trim() : '';
    const version = typeof clientInfo?.version === 'string' ? clientInfo.version.trim() : '';
    if (!name) {
        return '未知';
    }
    const lower = name.toLowerCase();
    if (lower.includes('codex')) {
        return 'Codex';
    }
    if (lower.includes('claude')) {
        return 'Claude';
    }
    if (lower.includes('cursor')) {
        return 'Cursor';
    }
    return version ? `${name} ${version}` : name;
}
