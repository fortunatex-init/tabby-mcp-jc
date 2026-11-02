import { Component, EventEmitter, NgZone, OnDestroy, Output, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { AuditEntry, AuditService } from '../../services/audit.service';
import { ConfirmService } from '../../services/confirm.service';
import { ToastService } from '../../services/toast.service';
import { t } from '../../i18n/t';
import { MCP_UI_STYLES } from '../shared-ui-styles';

type AuditRow = AuditEntry & { ts?: string };

@Component({
    selector: 'claude-mcp-audit-tab',
    encapsulation: ViewEncapsulation.None,
    styles: [MCP_UI_STYLES],
    template: `
        <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
            <span class="text-muted small flex-grow-1"
                ><code>{{ audit.logPath }}</code></span
            >
            <button class="btn btn-sm btn-ghost" (click)="refresh()">
                <i class="fas fa-rotate me-1"></i>{{ 'audit.refresh' | mcpT }}
            </button>
            <button class="btn btn-sm btn-outline-danger" (click)="clear()">
                {{ 'audit.clear' | mcpT }}
            </button>
        </div>

        <div class="mcp-audit-bar" *ngIf="entries.length">
            <input
                type="search"
                class="form-control form-control-sm"
                [(ngModel)]="filterQ"
                [placeholder]="'audit.searchPlaceholder' | mcpT"
            />
            <select class="form-select form-select-sm" [(ngModel)]="filterCaller">
                <option value="">{{ 'audit.allCallers' | mcpT }}</option>
                <option *ngFor="let c of callers" [value]="c">{{ c }}</option>
            </select>
            <select class="form-select form-select-sm" [(ngModel)]="filterResult">
                <option value="">{{ 'audit.allResults' | mcpT }}</option>
                <option value="ok">{{ 'audit.resultOk' | mcpT }}</option>
                <option value="denied">{{ 'audit.resultDenied' | mcpT }}</option>
                <option value="error">{{ 'audit.resultError' | mcpT }}</option>
            </select>
        </div>

        <mcp-ui-state
            *ngIf="loading"
            kind="loading"
            titleKey="common.loading"
            hintKey="audit.loadingHint"
        ></mcp-ui-state>

        <mcp-ui-state
            *ngIf="!loading && !entries.length"
            kind="empty"
            titleKey="audit.empty"
            hintKey="audit.emptyHint"
            icon="fa-clipboard-list"
        ></mcp-ui-state>

        <mcp-ui-state
            *ngIf="!loading && entries.length && !filteredEntries.length"
            kind="empty"
            titleKey="audit.filterEmpty"
            hintKey="audit.filterEmptyHint"
            icon="fa-filter"
        ></mcp-ui-state>

        <div class="mcp-table-wrap" *ngIf="!loading && filteredEntries.length">
            <table class="table table-sm table-striped table-bordered align-middle mb-0">

                <thead>
                    <tr class="text-nowrap text-center">
                        <th>{{ 'audit.time' | mcpT }}</th>
                        <th>{{ 'audit.caller' | mcpT }}</th>
                        <th>{{ 'audit.tool' | mcpT }}</th>
                        <th>{{ 'audit.tab' | mcpT }}</th>
                        <th style="width: 35%;" class="text-start">{{ 'audit.command' | mcpT }}</th>
                        <th style="width: 35%;" class="text-start">{{ 'audit.note' | mcpT }}</th>
                        <th>{{ 'audit.result' | mcpT }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let e of filteredEntries">
                        <td
                            class="text-nowrap text-center small"
                            [attr.title]="absoluteTime(e)"
                        >
                            {{ relativeTime(e) }}
                        </td>
                        <td class="text-nowrap text-center small">{{ e.caller || '-' }}</td>
                        <td class="text-nowrap text-center small">{{ e.tool }}</td>
                        <td class="text-nowrap text-center small">{{ e.tabTitle }}</td>
                        <td
                            class="small text-start mcp-mono"
                            style="word-break: break-all;"
                            [attr.title]="e.text || null"
                        >
                            {{ e.text }}
                        </td>

                        <td class="small text-start">
                            <div *ngIf="e.explanation">{{ e.explanation }}</div>
                            <div class="text-warning" *ngIf="e.feedback">
                                {{ 'audit.reason' | mcpT: { reason: e.feedback } }}
                            </div>
                            <div class="text-warning" *ngIf="e.error === 'confirm_timeout'">
                                {{ 'audit.timeout' | mcpT }}
                            </div>
                            <div class="text-warning" *ngIf="e.error === 'client_cancelled'">
                                {{ 'audit.disconnected' | mcpT }}
                            </div>
                        </td>
                        <td class="text-nowrap text-center small">
                            <span class="mcp-badge-result" [ngClass]="resultBadgeClass(e.result)">
                                {{ resultLabel(e.result) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
})
export class ClaudeMcpAuditTabComponent implements OnDestroy {
    @Output() changed = new EventEmitter<void>();

    entries: AuditRow[] = [];
    loading = false;
    filterQ = '';
    filterCaller = '';
    filterResult = '';

    private sub: Subscription;

    constructor(
        public audit: AuditService,
        private toast: ToastService,
        private confirm: ConfirmService,
        private zone: NgZone,
    ) {
        this.entries = this.read();

        this.sub = this.audit.changed$.pipe(debounceTime(200)).subscribe(() => {
            this.zone.run(() => {
                this.entries = this.read();
            });
        });
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    get callers(): string[] {
        const set = new Set<string>();
        for (const e of this.entries) {
            if (e.caller) set.add(e.caller);
        }
        return [...set].sort();
    }

    get filteredEntries(): AuditRow[] {
        const q = this.filterQ.trim().toLowerCase();
        return this.entries.filter(e => {
            if (this.filterResult && e.result !== this.filterResult) return false;
            if (this.filterCaller && (e.caller || '') !== this.filterCaller) return false;
            if (q) {
                const hay = `${e.text || ''} ${e.explanation || ''} ${e.tool || ''} ${e.caller || ''} ${e.tabTitle || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }

    resultLabel(result: string): string {
        if (result === 'ok') return t('audit.resultOk');
        if (result === 'denied') return t('audit.resultDenied');
        if (result === 'error') return t('audit.resultError');
        return result;
    }

    resultBadgeClass(result: string): string {
        if (result === 'ok') return 'mcp-badge-ok';
        if (result === 'denied') return 'mcp-badge-denied';
        if (result === 'error') return 'mcp-badge-error';
        return '';
    }

    refresh(): void {
        if (this.loading) return;
        this.loading = true;
        const before = this.entries.length;
        setTimeout(() => {
            this.zone.run(() => {
                this.entries = this.read();
                this.loading = false;
                this.changed.emit();
                const delta = this.entries.length - before;
                this.toast.notice(
                    delta > 0
                        ? t('audit.refreshedDelta', { n: this.entries.length, delta })
                        : t('audit.refreshed', { n: this.entries.length }),
                );
            });
        }, 0);
    }

    async clear(): Promise<void> {
        const before = this.entries.length;
        if (!before) {
            this.toast.notice(t('audit.nothingToClear'));
            return;
        }
        const ok = await this.confirm.ask(
            t('audit.clearTitle'),
            t('audit.clearBody', { n: before, path: this.audit.logPath }),
            t('audit.clear'),
            true,
        );
        if (!ok) {
            this.toast.notice(t('audit.clearCancelled'));
            return;
        }
        this.audit.clear();
        this.entries = this.read();
        this.changed.emit();
        if (this.entries.length) {
            this.toast.error(
                t('audit.clearStillThere', {
                    n: this.entries.length,
                }),
                t('audit.clearFailed'),
            );
        } else {
            this.toast.success(t('audit.cleared'));
        }
    }

    absoluteTime(e: AuditRow): string {
        return (e.ts ?? '').replace('T', ' ').replace(/\..*$/, '');
    }

    relativeTime(e: AuditRow): string {
        const abs = this.absoluteTime(e);
        const ts = Date.parse(e.ts ?? '');
        if (!Number.isFinite(ts)) return abs || '-';
        const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (sec < 60) return t('audit.justNow');
        if (sec < 3600) return t('audit.minutesAgo', { n: Math.floor(sec / 60) });
        if (sec < 86400) return t('audit.hoursAgo', { n: Math.floor(sec / 3600) });
        return t('audit.daysAgo', { n: Math.floor(sec / 86400) });
    }

    private read(): AuditRow[] {
        return this.audit.tail(50).reverse() as AuditRow[];
    }
}
