import take from 'lodash/take';

export type ActivityKind =
    | 'list_tabs'
    | 'read_terminal'
    | 'write_terminal'
    | 'await_enter'
    | 'connect'
    | 'disconnect'
    | 'pause'
    | 'resume'
    | 'rotate_token'
    | 'other';

export interface ActivityEntry {
    id: number;
    at: number;
    kind: ActivityKind;
    summary: string;
    client?: string;
    tabId?: string;
    result?: string;
}

export const ACTIVITY_LIMIT = 20;

export function pushActivity(
    list: ActivityEntry[],
    entry: Omit<ActivityEntry, 'id'> & { id?: number },
    nextId: number,
): { list: ActivityEntry[]; nextId: number } {
    const item: ActivityEntry = {
        id: entry.id ?? nextId,
        at: entry.at,
        kind: entry.kind,
        summary: entry.summary,
        client: entry.client,
        tabId: entry.tabId,
        result: entry.result,
    };
    const out = take([item, ...list], ACTIVITY_LIMIT);
    return { list: out, nextId: Math.max(nextId, item.id) + 1 };
}
