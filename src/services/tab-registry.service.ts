import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AppService, BaseTabComponent, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent } from 'tabby-terminal';

import {
    classifyInput,
    LineOrigin,
    LineSignature,
    LineTracker,
    PendingReason,
    readLineSignature,
} from '../core/line-state';

const RECENT_ENTER_MS = 60_000;

export interface RegisteredTab {
    id: string;
    tab: BaseTerminalTabComponent<any>;
    active: boolean;
}

@Injectable({ providedIn: 'root' })
export class TabRegistryService {
    private ids = new WeakMap<BaseTerminalTabComponent<any>, string>();
    private byId = new Map<string, BaseTerminalTabComponent<any>>();
    private seq = 0;

    private enterAt = new WeakMap<BaseTerminalTabComponent<any>, number>();
    private typedAt = new WeakMap<BaseTerminalTabComponent<any>, number>();
    private readAnchor = new WeakMap<BaseTerminalTabComponent<any>, number>();
    private enterSubject = new Subject<BaseTerminalTabComponent<any>>();

    private lines = new WeakMap<BaseTerminalTabComponent<any>, LineTracker>();
    private aiWriting: BaseTerminalTabComponent<any> | null = null;

    constructor(private app: AppService) {}

    get enter$(): Observable<BaseTerminalTabComponent<any>> {
        return this.enterSubject.asObservable();
    }

    markEnter(tab: BaseTerminalTabComponent<any>): void {
        this.enterAt.set(tab, Date.now());
        this.enterSubject.next(tab);
    }

    markTyped(tab: BaseTerminalTabComponent<any>): void {
        this.typedAt.set(tab, Date.now());
    }

    markReadAnchor(tab: BaseTerminalTabComponent<any>, line: number): void {
        this.readAnchor.set(tab, line);
    }

    getReadAnchor(tab: BaseTerminalTabComponent<any>): number | undefined {
        return this.readAnchor.get(tab);
    }

    takePendingEnter(tab: BaseTerminalTabComponent<any>): boolean {
        const enter = this.enterAt.get(tab);
        if (enter === undefined) {
            return false;
        }

        const typed = this.typedAt.get(tab);
        const hit = typed === undefined ? Date.now() - enter <= RECENT_ENTER_MS : enter > typed;

        if (hit) {
            this.enterAt.delete(tab);
        }
        return hit;
    }

    recordInput(tab: BaseTerminalTabComponent<any>, data: Buffer, origin: LineOrigin): void {
        this.lineOf(tab).recordInput(classifyInput(data.toString('latin1')), origin, () =>
            this.signatureOf(tab),
        );
    }

    recordOutput(tab: BaseTerminalTabComponent<any>): void {
        this.lineOf(tab).recordOutput();
    }

    resetLine(tab: BaseTerminalTabComponent<any>): void {
        this.lineOf(tab).reset();
    }

    setComposing(tab: BaseTerminalTabComponent<any>, composing: boolean): void {
        this.lineOf(tab).composing = composing;
    }

    runAiWrite(tab: BaseTerminalTabComponent<any>, write: () => void): void {
        this.aiWriting = tab;
        try {
            write();
        } finally {
            this.aiWriting = null;
        }
    }

    isAiWriting(tab: BaseTerminalTabComponent<any>): boolean {
        return this.aiWriting === tab;
    }

    judgeLine(tab: BaseTerminalTabComponent<any>): PendingReason | null {
        return this.lineOf(tab).judge(this.signatureOf(tab));
    }

    private lineOf(tab: BaseTerminalTabComponent<any>): LineTracker {
        let line = this.lines.get(tab);
        if (!line) {
            line = new LineTracker();
            this.lines.set(tab, line);
        }
        return line;
    }

    private signatureOf(tab: BaseTerminalTabComponent<any>): LineSignature | null {
        if (!tab.frontendIsReady) {
            return null;
        }
        const buf = (tab.frontend as any)?.xterm?.buffer?.active;
        return buf ? readLineSignature(buf) : null;
    }

    register(tab: BaseTerminalTabComponent<any>): string {
        const existing = this.ids.get(tab);
        if (existing) {
            return existing;
        }
        const id = `tab-${++this.seq}`;
        this.ids.set(tab, id);
        this.byId.set(id, tab);
        return id;
    }

    unregister(tab: BaseTerminalTabComponent<any>): void {
        const id = this.ids.get(tab);
        if (id) {
            this.byId.delete(id);
            this.ids.delete(tab);
        }
    }

    get(id: string): BaseTerminalTabComponent<any> | null {
        return this.byId.get(id) ?? null;
    }

    list(): RegisteredTab[] {
        const active = this.activeTerminal();
        return this.flatten(this.app.tabs)
            .filter(
                (t): t is BaseTerminalTabComponent<any> => t instanceof BaseTerminalTabComponent,
            )
            .map(tab => ({ id: this.register(tab), tab, active: tab === active }));
    }

    private flatten(tabs: BaseTabComponent[], depth = 0): BaseTabComponent[] {
        if (depth > 8) {
            return [];
        }
        const out: BaseTabComponent[] = [];
        for (const t of tabs) {
            if (t instanceof SplitTabComponent) {
                out.push(...this.flatten(t.getAllTabs(), depth + 1));
            } else {
                out.push(t);
            }
        }
        return out;
    }

    private activeTerminal(): BaseTabComponent | null {
        const t = this.app.activeTab;
        if (t instanceof SplitTabComponent) {
            return t.getFocusedTab();
        }
        return t;
    }
}
