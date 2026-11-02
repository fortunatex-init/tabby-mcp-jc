import { Component } from '@angular/core';

import { ConfigService } from 'tabby-core';

import { AuditService } from '../../services/audit.service';
import { HttpProcessService } from '../../services/http-process.service';
import { ToastService } from '../../services/toast.service';
import { t } from '../../i18n/t';

@Component({
    selector: 'claude-mcp-config-tab',

    template: `
                <div class="mcp-cfg-section network-only">
            <div class="mcp-cfg-section-h">
                <i class="fas fa-network-wired text-primary"></i> {{ 'config.networkSection' | mcpT }}
                <span class="badge bg-secondary ms-auto">{{ 'config.networkBadge' | mcpT }}</span>
            </div>

            <div class="mcp-cfg-row">
                <div>
                    <label class="form-label mb-1" for="cmcp-bind">{{ 'config.bindAddress' | mcpT }}</label>
                    <div class="mcp-cfg-help">{{ 'config.bindHelp' | mcpT }}</div>
                </div>
                <select
                    id="cmcp-bind"
                    class="form-select form-select-sm"
                    style="max-width: 10rem;"
                    [(ngModel)]="httpBindHost"
                    (ngModelChange)="onHttpBindHostChange()"
                >
                    <option value="127.0.0.1">{{ 'config.bindLoopback' | mcpT }}</option>
                    <option value="0.0.0.0">{{ 'config.bindLan' | mcpT }}</option>
                </select>
            </div>

            <div class="alert alert-warning small mb-2" *ngIf="httpBindHost === '0.0.0.0'">
                {{ 'config.lanWarning' | mcpT }}
            </div>

        </div>

        <hr class="mcp-section-sep" aria-hidden="true" />

        <div class="mcp-cfg-section">
            <div class="mcp-cfg-section-h">
                <i class="fas fa-robot text-primary"></i> {{ 'config.modelCanDo' | mcpT }}
            </div>

            <div class="mcp-cfg-row">
                <div>
                    <label class="form-check-label mcp-pointer" for="cmcp-read">{{
                        'config.allowRead' | mcpT
                    }}</label>
                    <div class="mcp-cfg-help" [innerHTML]="'config.allowReadHelp' | mcpT"></div>
                </div>
                <div class="form-check form-switch mb-0">
                    <input
                        type="checkbox"
                        class="form-check-input"
                        id="cmcp-read"
                        [(ngModel)]="cfg.allowReadTerminal"
                        (ngModelChange)="save()"
                    />
                </div>
            </div>

            <div class="mcp-cfg-under" *ngIf="cfg.allowReadTerminal">
                <label class="form-label mb-1">
                    {{ 'config.maxLines' | mcpT }}
                    <span class="text-muted small">{{ 'config.maxLinesHelp' | mcpT }}</span>
                </label>
                <input
                    type="number"
                    class="form-control"
                    style="max-width: 8rem;"
                    min="1"
                    max="5000"
                    step="1"
                    [(ngModel)]="cfg.maxReadLines"
                    (change)="saveMaxReadLines()"
                />
            </div>

            <div class="mcp-cfg-row">
                <div>
                    <label class="form-check-label mcp-pointer" for="cmcp-wait">{{
                        'config.allowWait' | mcpT
                    }}</label>
                    <div class="mcp-cfg-help">
                        {{ 'config.allowWaitHelp' | mcpT }}
                        <span *ngIf="!cfg.allowReadTerminal">
                            <br />{{ 'config.waitNeedsRead' | mcpT }}
                        </span>
                    </div>
                </div>
                <div class="form-check form-switch mb-0">
                    <input
                        type="checkbox"
                        class="form-check-input"
                        id="cmcp-wait"
                        [(ngModel)]="cfg.waitForEnter"
                        (ngModelChange)="save()"
                    />
                </div>
            </div>
        </div>

        <div class="mcp-cfg-section">
            <div class="mcp-cfg-section-h">
                <i class="fas fa-shield-alt text-warning"></i> {{ 'config.safety' | mcpT }}
            </div>

            <div class="mcp-cfg-row">
                <div>
                    <label class="form-check-label mcp-pointer" for="cmcp-confirm">{{
                        'config.confirmOutside' | mcpT
                    }}</label>
                    <div class="mcp-cfg-help" [innerHTML]="'config.confirmHelp' | mcpT"></div>
                </div>
                <div class="form-check form-switch mb-0">
                    <input
                        type="checkbox"
                        class="form-check-input"
                        id="cmcp-confirm"
                        [(ngModel)]="confirmNonWhitelisted"
                        (ngModelChange)="save()"
                    />
                </div>
            </div>
        </div>

        <div class="mcp-cfg-section mb-0">
            <div class="mcp-cfg-section-h">
                <i class="fas fa-clipboard-list text-info"></i> {{ 'config.log' | mcpT }}
            </div>

            <div class="mcp-cfg-row">
                <div>
                    <label class="form-check-label mcp-pointer" for="cmcp-audit">{{
                        'config.audit' | mcpT
                    }}</label>
                    <div class="mcp-cfg-help">
                        <code>{{ audit.logPath }}</code><br />
                        {{ 'config.auditHelp' | mcpT: { days: audit.retentionDays } }}
                    </div>
                </div>
                <div class="form-check form-switch mb-0">
                    <input
                        type="checkbox"
                        class="form-check-input"
                        id="cmcp-audit"
                        [(ngModel)]="cfg.auditLog"
                        (ngModelChange)="save()"
                    />
                </div>
            </div>
        </div>
    `,

    styles: [],
})
export class ClaudeMcpConfigTabComponent {
    constructor(

        private config: ConfigService,

        public audit: AuditService,

        private toast: ToastService,

        private httpProcess: HttpProcessService,

    ) {}

    get httpBindHost(): string {
        const v = this.config.store.claudeMcp?.httpBindHost;
        return v === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
    }

    set httpBindHost(v: string) {
        this.config.store.claudeMcp.httpBindHost = (
            v === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1'
        ) as any;
    }

    onHttpBindHostChange(): void {
        const v = this.config.store.claudeMcp.httpBindHost;
        if (v !== '0.0.0.0' && v !== '127.0.0.1') {
            this.config.store.claudeMcp.httpBindHost = '127.0.0.1';
        }
        void this.config.save();
        void this.httpProcess.restartServing();
        this.toast.notice(t('clients.rebindHttp'));
    }

    get confirmNonWhitelisted(): boolean {
        return this.cfg.confirmNonWhitelisted !== false;
    }
    set confirmNonWhitelisted(v: boolean) {
        this.cfg.confirmNonWhitelisted = !!v;
    }

    get cfg(): any {
        return this.config.store.claudeMcp;
    }

    save(): void {
        void this.config.save();
    }

    saveMaxReadLines(): void {
        const raw = this.cfg.maxReadLines;
        const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (!Number.isFinite(n) || n < 1 || n > 5000) {
            const fixed = Math.min(5000, Math.max(1, Number.isFinite(n) ? Math.floor(n) : 200));
            this.cfg.maxReadLines = fixed;
            this.toast.notice(t('config.maxLinesInvalid', { n: fixed }));
        } else {
            this.cfg.maxReadLines = Math.floor(n);
        }
        void this.config.save();
    }
}
