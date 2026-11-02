import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';

import { McpControlService } from './mcp-control.service';
import { TabRegistryService } from './tab-registry.service';

const FLASH_MS = 3000;
const FLASH_ICON = 'bolt';

@Injectable({ providedIn: 'root' })
export class ActivityTabFlashService implements OnDestroy {
    private sub: Subscription | null = null;
    private timers = new Map<object, ReturnType<typeof setTimeout>>();
    private prevIcons = new WeakMap<object, string | null>();

    constructor(
        private control: McpControlService,
        private registry: TabRegistryService,
    ) {
        this.sub = this.control.activities$.pipe(skip(1)).subscribe(list => {
            const newest = list[0];
            if (!newest?.tabId) return;
            if (
                newest.kind === 'pause' ||
                newest.kind === 'resume' ||
                newest.kind === 'connect' ||
                newest.kind === 'disconnect'
            ) {
                return;
            }
            const tab = this.registry.get(newest.tabId) as any;
            if (!tab) return;
            this.flash(tab);
        });
    }

    private flash(tab: any): void {
        if (!this.prevIcons.has(tab)) {
            this.prevIcons.set(tab, tab.icon ?? null);
        }
        tab.icon = FLASH_ICON;
        const old = this.timers.get(tab);
        if (old) clearTimeout(old);
        this.timers.set(
            tab,
            setTimeout(() => {
                tab.icon = this.prevIcons.get(tab) ?? null;
                this.timers.delete(tab);
            }, FLASH_MS),
        );
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
        for (const t of this.timers.values()) clearTimeout(t);
    }
}
