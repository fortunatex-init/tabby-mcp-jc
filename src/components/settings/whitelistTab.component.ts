import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ConfigService } from 'tabby-core';

import { ConfirmService } from '../../services/confirm.service';
import { ToastService } from '../../services/toast.service';
import { DEFAULT_WHITELIST } from '../../core/whitelist';
import { t } from '../../i18n/t';

@Component({
    selector: 'claude-mcp-whitelist-tab',
    template: `
        <p class="text-muted small" [innerHTML]="helpHtml | mcpT"></p>
        <mcp-ui-state
            *ngIf="count === 0"
            kind="empty"
            titleKey="whitelist.emptyTitle"
            hintKey="whitelist.emptyWarning"
            icon="fa-shield-alt"
            class="mb-3 d-block"
        ></mcp-ui-state>

        <div class="mcp-wl-toolbar">
            <span class="mcp-hint-chip">{{ 'whitelist.hintPrefix' | mcpT }}</span>
            <span class="mcp-hint-chip regex">{{ 'whitelist.hintRegex' | mcpT }}</span>
            <span class="mcp-hint-chip force">{{ 'whitelist.hintForce' | mcpT }}</span>
            <span class="mcp-count-pill ms-auto">{{ 'whitelist.countPill' | mcpT: { n: count } }}</span>
        </div>

        <div class="mcp-editor-shell">
            <div class="mcp-gutter" #gutter aria-hidden="true">
                <span *ngFor="let n of lineNumbers">{{ n }}</span>
            </div>
            <textarea
                #editor
                class="form-control mcp-mono mcp-editor-body"
                rows="16"
                spellcheck="false"
                [(ngModel)]="text"
                (ngModelChange)="onTextChange()"
                (blur)="flushSave()"
                (scroll)="syncGutter()"
            ></textarea>
        </div>

        <div class="small text-danger mt-1" *ngIf="invalidLines.length">
            {{ 'whitelist.invalidRegex' | mcpT: { lines: invalidLines.join(', ') } }}
        </div>
        <div class="mcp-wl-foot">
            <button class="btn btn-sm btn-outline-danger" (click)="reset()">
                {{ 'whitelist.restore' | mcpT }}
            </button>
            <span class="text-muted small">{{ 'whitelist.saveHint' | mcpT }}</span>
            <span class="text-muted small" *ngIf="savedFlash">{{ 'whitelist.saved' | mcpT }}</span>
        </div>
    `,
    styles: [
        `
            .mcp-mono {
                font-family: 'Source Code Pro', ui-monospace, monospace;
            }
        `,
    ],
})
export class ClaudeMcpWhitelistTabComponent implements OnDestroy {
    text = '';
    savedFlash = false;
    invalidLines: number[] = [];

    readonly helpHtml = 'whitelist.help';

    @ViewChild('gutter') gutterRef?: ElementRef<HTMLDivElement>;
    @ViewChild('editor') editorRef?: ElementRef<HTMLTextAreaElement>;

    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private flashTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private config: ConfigService,
        private toast: ToastService,
        private confirm: ConfirmService,
    ) {
        this.text = (this.config.store.claudeMcp?.whitelist ?? []).join('\n');
        this.recomputeInvalid();
    }

    ngOnDestroy(): void {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        if (this.flashTimer) clearTimeout(this.flashTimer);
        this.flushSave();
    }

    get count(): number {
        return this.text.split('\n').filter(s => s.trim()).length;
    }

    get lineNumbers(): number[] {
        const n = Math.max(this.text.split('\n').length, 6);
        return Array.from({ length: n }, (_, i) => i + 1);
    }

    syncGutter(): void {
        const ed = this.editorRef?.nativeElement;
        const gut = this.gutterRef?.nativeElement;
        if (ed && gut) gut.scrollTop = ed.scrollTop;
    }

    onTextChange(): void {
        this.recomputeInvalid();
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.flushSave(), 400);
    }

    flushSave(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        this.save();
    }

    save(): void {
        this.config.store.claudeMcp.whitelist = this.text
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
        void this.config.save();
        this.savedFlash = true;
        if (this.flashTimer) clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => {
            this.savedFlash = false;
        }, 1500);
    }

    async reset(): Promise<void> {
        const before = this.count;
        const ok = await this.confirm.ask(
            t('whitelist.restoreTitle'),
            t('whitelist.restoreBody', { before, after: DEFAULT_WHITELIST.length }),
            t('whitelist.restore'),
            true,
        );
        if (!ok) {
            this.toast.notice('whitelist.cancelled');
            return;
        }
        this.text = DEFAULT_WHITELIST.join('\n');
        this.recomputeInvalid();
        this.save();
        this.toast.success(
            t('whitelist.savedCount', { before, after: DEFAULT_WHITELIST.length }),
            'whitelist.restored',
        );
    }

    private recomputeInvalid(): void {
        const bad: number[] = [];
        this.text.split('\n').forEach((line, idx) => {
            const s = line.trim();
            if (!s.startsWith('/')) return;
            const m = /^\/(.+)\/([gimsuy]*)$/.exec(s);
            if (!m) {
                bad.push(idx + 1);
                return;
            }
            try {
                // eslint-disable-next-line no-new
                new RegExp(m[1], m[2]);
            } catch {
                bad.push(idx + 1);
            }
        });
        this.invalidLines = bad;
    }
}
