import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

import { ActivityEntry, ActivityKind, pushActivity } from '../core/activity';
import { clearPauseOnStartup, isPaused, setPaused } from '../core/pause-flag';

export interface McpClientInfo {
    id: string;
    label: string;
    transport: 'pipe' | 'http';
    connectedAt: number;
    lastSeenAt: number;
}

@Injectable({ providedIn: 'root' })
export class McpControlService {
    private nextActivityId = 1;
    private activities: ActivityEntry[] = [];
    private clients = new Map<string, McpClientInfo>();

    readonly paused$ = new BehaviorSubject<boolean>(false);
    readonly activities$ = new BehaviorSubject<ActivityEntry[]>([]);
    readonly clients$ = new BehaviorSubject<McpClientInfo[]>([]);
    readonly cancelWaits$ = new Subject<void>();

    initOnStartup(): void {
        clearPauseOnStartup();
        this.paused$.next(false);
    }

    get paused(): boolean {
        return this.paused$.value || isPaused();
    }

    pauseAll(): void {
        setPaused(true);
        this.paused$.next(true);
        this.cancelWaits$.next();
        this.clearClients();
        this.record('pause', '全部断开并暂停');
    }

    resume(): void {
        setPaused(false);
        this.paused$.next(false);
        this.record('resume', '已恢复服务');
    }

    syncFromFlag(): void {
        const p = isPaused();
        if (p !== this.paused$.value) {
            this.paused$.next(p);
        }
    }

    touchClient(id: string, label: string, transport: 'pipe' | 'http'): void {
        const now = Date.now();
        const prev = this.clients.get(id);
        if (prev) {
            prev.lastSeenAt = now;
            prev.label = label || prev.label;
        } else {
            this.clients.set(id, {
                id,
                label: label || id,
                transport,
                connectedAt: now,
                lastSeenAt: now,
            });
            this.record('connect', `客户端接入: ${label || id}`, { client: label });
        }
        this.emitClients();
    }

    dropClient(id: string): void {
        const c = this.clients.get(id);
        if (c) {
            this.clients.delete(id);
            this.record('disconnect', `客户端断开: ${c.label}`, { client: c.label });
            this.emitClients();
        }
    }

    clearClients(): void {
        this.clients.clear();
        this.emitClients();
    }

    record(
        kind: ActivityKind,
        summary: string,
        extra?: { client?: string; tabId?: string; result?: string },
    ): void {
        const r = pushActivity(
            this.activities,
            {
                at: Date.now(),
                kind,
                summary,
                client: extra?.client,
                tabId: extra?.tabId,
                result: extra?.result,
            },
            this.nextActivityId,
        );
        this.activities = r.list;
        this.nextActivityId = r.nextId;
        this.activities$.next(this.activities);
    }

    private emitClients(): void {
        this.clients$.next([...this.clients.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt));
    }
}
