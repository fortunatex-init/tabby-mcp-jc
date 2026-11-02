import { Component, Injectable, NgZone, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ConfigService } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';

import { AuditService } from '../../services/audit.service';
import { ClaudeDesktopService } from '../../clients/claude-desktop.service';
import { CodexService } from '../../clients/codex.service';
import { CursorService } from '../../clients/cursor.service';
import { McpServerService } from '../../services/mcp-server.service';
import { HttpProcessService } from '../../services/http-process.service';
import { McpControlService } from '../../services/mcp-control.service';
import { ToastService } from '../../services/toast.service';
import { readHttpPort } from '../../core/http-endpoint';
import { VERSION } from '../../core/server-info';
import { t } from '../../i18n/t';
import { MCP_UI_STYLES } from '../shared-ui-styles';

type TabId = 'config' | 'clients' | 'whitelist' | 'audit';

@Component({
    host: { class: 'mcp-settings' },
    encapsulation: ViewEncapsulation.None,
    styles: [
        MCP_UI_STYLES,
        `

            settings-tab-body:has(> .mcp-settings) {
                max-width: 1280px;
            }

            .mcp-window-id {
                display: inline-flex;
                align-items: baseline;
                gap: 6px;
                padding: 2px 10px;
                border: 1px solid currentColor;
                border-radius: 999px;
                font-size: 1rem;
            }
            .mcp-window-id-value {
                font-family: 'Source Code Pro', monospace;
                font-weight: 600;
                letter-spacing: 0.03em;
            }

            .mcp-http-detail {
                color: var(--bs-primary);
                font-size: 1rem;
            }
            .mcp-http-detail code {
                color: inherit;
                font-size: inherit;
            }
            .mcp-http-ok {
                color: var(--bs-success);
            }
            .mcp-http-warn {
                color: var(--bs-warning);
            }
            .mcp-http-err {
                color: var(--bs-danger);
            }

            claude-mcp-config-tab .text-muted,
            claude-mcp-clients-tab .text-muted,
            claude-mcp-whitelist-tab .text-muted,
            claude-mcp-audit-tab .text-muted {
                color: var(--bs-body-color) !important;
                opacity: 0.78;
            }

            claude-mcp-config-tab code,
            claude-mcp-clients-tab code,
            claude-mcp-whitelist-tab code,
            claude-mcp-audit-tab code {
                background: rgba(127, 127, 127, 0.2);
                color: inherit;
                padding: 1px 5px;
                border-radius: 4px;
                overflow-wrap: anywhere;
            }
        `,
    ],
    template: `

        <div class="mcp-hero" [class.paused]="paused">
            <div>
                <div class="mcp-hero-title">
                    {{ 'settings.pluginTitle' | mcpT }}
                    <span class="mcp-ver">v{{ version }}</span>
                </div>

                <div class="mcp-pause-bar" *ngIf="paused" role="status">
                    <span class="pause-badge">{{ 'settings.pauseBadge' | mcpT }}</span>
                    <span class="pause-text">{{ 'settings.pauseBarBody' | mcpT }}</span>
                </div>

                <div class="mcp-lanes" role="status">
                    <div class="mcp-lane">
                        <div class="mcp-lane-h">
                            <i class="fas fa-terminal"></i> {{ 'settings.lanePipe' | mcpT }}
                        </div>
                        <div class="mcp-lane-body">
                            <span class="mcp-status-dot" [ngClass]="pipeDotClass"></span>
                            <strong [ngClass]="pipeToneClass">{{ pipeStatusLabel }}</strong>
                            <span class="mcp-chip" *ngIf="pipeRunning">
                                {{ 'settings.windowId' | mcpT }}
                                <strong class="mcp-mono">{{ server.windowId }}</strong>
                            </span>
                        </div>
                        <div class="lane-msg" *ngIf="server.statusMessage">
                            {{ server.statusMessage | mcpT }}
                        </div>
                    </div>
                    <div class="mcp-lane">
                        <div class="mcp-lane-h">
                            <i class="fas fa-globe"></i> {{ 'settings.laneHttp' | mcpT }}
                        </div>
                        <div class="mcp-lane-body">
                            <span class="mcp-status-dot" [ngClass]="httpDotClass"></span>
                            <strong [ngClass]="httpToneClass">{{ httpLaneLabel }}</strong>
                            <span class="mcp-chip lan" *ngIf="lanExposed" [attr.title]="'config.lanWarning' | mcpT">
                                <i class="fas fa-network-wired"></i>
                                <strong>{{ 'settings.lanChip' | mcpT }}</strong>
                            </span>
                        </div>
                        <div class="lane-msg" *ngIf="httpProcess.statusMessage">
                            {{ httpProcess.statusMessage | mcpT }}
                        </div>
                    </div>
                </div>

                <div class="mcp-meta">
                    <span
                        class="mcp-chip"
                        *ngIf="httpLive"
                        [attr.title]="'settings.portChipTitle' | mcpT"
                    >
                        {{ 'settings.portChip' | mcpT }}
                        <strong>{{ httpPort }}</strong>
                    </span>
                    <span
                        class="mcp-chip mcp-dim"
                        *ngIf="!httpLive"
                        [attr.title]="'settings.httpChipIdleTitle' | mcpT"
                    >
                        {{ 'settings.portChip' | mcpT }}
                        <strong>{{ httpPort }}</strong>
                    </span>
                    <span class="mcp-chip" *ngIf="httpLive && httpProcess.mcpUrl">
                        URL
                        <code>{{ httpProcess.mcpUrl }}</code>
                    </span>
                    <span
                        class="mcp-chip mcp-dim"
                        *ngIf="!httpLive && httpProcess.mcpUrl"
                        [attr.title]="'settings.httpChipIdleTitle' | mcpT"
                    >
                        URL
                        <code>{{ httpProcess.mcpUrl }}</code>
                    </span>
                </div>
            </div>

            <div class="mcp-hero-actions">
                <button
                    class="btn btn-sm btn-primary"
                    type="button"
                    *ngIf="paused"
                    (click)="resume()"
                    [disabled]="restarting"
                >
                    {{ 'settings.resumeService' | mcpT }}
                </button>
                <button
                    class="btn btn-sm"
                    type="button"
                    [class.btn-primary]="!paused"
                    [class.btn-outline-secondary]="paused"
                    (click)="restart()"
                    [disabled]="restarting"
                    [attr.title]="restartButtonTitle"
                >
                    <span
                        class="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                        *ngIf="restarting"
                    ></span>
                    <ng-container *ngIf="!restarting">
                        {{ 'settings.restart' | mcpT }}
                    </ng-container>
                    <ng-container *ngIf="restarting">{{ 'settings.restarting' | mcpT }}</ng-container>
                </button>
            </div>
        </div>

        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    type="button"
                    role="tab"
                    id="mcp-tab-config"
                    [class.active]="tab === 'config'"
                    [attr.aria-selected]="tab === 'config'"
                    aria-controls="mcp-pane-config"
                    (click)="setTab('config')"
                >
                    {{ 'settings.config' | mcpT }}
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    type="button"
                    role="tab"
                    id="mcp-tab-clients"
                    [class.active]="tab === 'clients'"
                    [attr.aria-selected]="tab === 'clients'"
                    aria-controls="mcp-pane-clients"
                    (click)="setTab('clients')"
                >
                    {{ 'settings.clients' | mcpT }}
                    <span
                        class="badge ms-1"
                        [class.bg-secondary]="!installedClients"
                        [class.bg-success]="installedClients"
                        >{{ installedClients }}/3</span
                    >
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    type="button"
                    role="tab"
                    id="mcp-tab-whitelist"
                    [class.active]="tab === 'whitelist'"
                    [attr.aria-selected]="tab === 'whitelist'"
                    aria-controls="mcp-pane-whitelist"
                    (click)="setTab('whitelist')"
                >
                    {{ 'settings.whitelist' | mcpT }}
                    <span class="badge bg-secondary ms-1">{{ whitelistCount }}</span>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    type="button"
                    role="tab"
                    id="mcp-tab-audit"
                    [class.active]="tab === 'audit'"
                    [attr.aria-selected]="tab === 'audit'"
                    aria-controls="mcp-pane-audit"
                    (click)="setTab('audit')"
                >
                    {{ 'settings.audit' | mcpT }}
                    <span class="badge bg-secondary ms-1" *ngIf="auditCount">{{ auditCount }}</span>
                </button>
            </li>
        </ul>

        <div
            id="mcp-pane-config"
            role="tabpanel"
            aria-labelledby="mcp-tab-config"
            *ngIf="tab === 'config'"
        >
            <claude-mcp-config-tab></claude-mcp-config-tab>
        </div>

        <div
            id="mcp-pane-clients"
            role="tabpanel"
            aria-labelledby="mcp-tab-clients"
            *ngIf="tab === 'clients'"
        >
            <claude-mcp-clients-tab (changed)="refreshBadges()" (openConfig)="setTab('config')"></claude-mcp-clients-tab>
        </div>

        <div
            id="mcp-pane-whitelist"
            role="tabpanel"
            aria-labelledby="mcp-tab-whitelist"
            *ngIf="tab === 'whitelist'"
        >
            <claude-mcp-whitelist-tab></claude-mcp-whitelist-tab>
        </div>

        <div
            id="mcp-pane-audit"
            role="tabpanel"
            aria-labelledby="mcp-tab-audit"
            *ngIf="tab === 'audit'"
        >
            <claude-mcp-audit-tab (changed)="refreshBadges()"></claude-mcp-audit-tab>
        </div>
    `,
})
export class ClaudeMcpSettingsTabComponent implements OnDestroy {
    tab: TabId = 'config';

    readonly version = VERSION;

    installedClients = 0;
    auditCount = 0;
    restarting = false;
    paused = false;

    private subs = new Subscription();

    constructor(
        private config: ConfigService,
        public server: McpServerService,
        public httpProcess: HttpProcessService,
        private control: McpControlService,
        private audit: AuditService,
        private claudeDesktop: ClaudeDesktopService,
        private codex: CodexService,
        private cursor: CursorService,
        private toast: ToastService,
        private zone: NgZone,
    ) {
        this.paused = this.control.paused;
        this.refreshBadges();

        this.subs.add(
            this.audit.changed$.pipe(debounceTime(200)).subscribe(() => {
                this.zone.run(() => this.refreshAuditCount());
            }),
        );

        this.subs.add(
            this.server.changed$.subscribe(() => {
                this.zone.run(() => {
                });
            }),
        );

        this.subs.add(
            this.control.paused$.subscribe(v => {
                this.zone.run(() => {
                    this.paused = v || this.control.paused;
                });
            }),
        );

        this.subs.add(
            this.httpProcess.changed$.subscribe(() => {
                this.zone.run(() => {
                });
            }),
        );
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    get whitelistCount(): number {
        return (this.config.store.claudeMcp?.whitelist ?? []).length;
    }

    get pipeRunning(): boolean {
        return this.server.status === 'running';
    }

    get httpLive(): boolean {
        return this.httpProcess.status === 'running';
    }

    get lanExposed(): boolean {
        return this.config.store.claudeMcp?.httpBindHost === '0.0.0.0';
    }

    get httpPort(): number {
        return this.httpProcess.livePort ?? readHttpPort();
    }

    get pipeStatusLabel(): string {
        return (
            {
                running: t('settings.running'),
                stopped: t('settings.stopped'),
                disabled: t('settings.disabled'),
                error: t('settings.startFailed'),
            }[this.server.status] ?? this.server.status
        );
    }

    get httpLaneLabel(): string {
        const base =
            {
                running: t('settings.httpRunning'),
                stopped: t('settings.httpIdle'),
                starting: t('settings.httpStarting'),
                error: t('settings.httpError'),
            }[this.httpProcess.status] ?? this.httpProcess.status;
        return base ? `HTTP ${base}` : '';
    }

    get pipeDotClass(): string {
        if (this.paused && this.pipeRunning) return 'warn';
        const s = this.server.status;
        if (s === 'running') return '';
        if (s === 'disabled') return 'warn';
        if (s === 'error') return 'err';
        return 'off';
    }

    get httpDotClass(): string {
        if (this.paused && this.httpLive) return 'warn';
        switch (this.httpProcess.status) {
            case 'running':
                return '';
            case 'starting':
                return 'warn';
            case 'error':
                return 'err';
            default:
                return 'off';
        }
    }

    get pipeToneClass(): string {
        if (this.paused && this.pipeRunning) return 'mcp-http-warn';
        if (this.server.status === 'error') return 'mcp-http-err';
        if (this.server.status === 'running') return 'mcp-http-ok';
        return 'mcp-http-warn';
    }

    get httpToneClass(): string {
        if (this.paused && this.httpLive) return 'mcp-http-warn';
        switch (this.httpProcess.status) {
            case 'running':
                return 'mcp-http-ok';
            case 'error':
                return 'mcp-http-err';
            default:
                return 'mcp-http-warn';
        }
    }

    setTab(t: TabId): void {
        this.tab = t;
    }

    resume(): void {
        this.control.resume();
        this.toast.success('toolbar.resumed');
    }

    get restartButtonTitle(): string {
        return t('settings.restartTitle')
    }

    async restart(): Promise<void> {
        if (this.restarting) return;
        this.restarting = true;
        try {
            await this.server.restart();
            await this.httpProcess.restartServing();
            this.toast.success('settings.restartedToast');
        } catch (e: any) {
            this.toast.error(e?.message ? String(e.message) : String(e));
        } finally {
            this.restarting = false;
        }
    }

    refreshBadges(): void {
        this.installedClients =
            (this.claudeDesktop.status().installed ? 1 : 0) +
            (this.codex.status().installed ? 1 : 0) +
            (this.cursor.status().installed ? 1 : 0);
        this.refreshAuditCount();
    }

    private refreshAuditCount(): void {
        this.auditCount = this.audit.tail(50).length;
    }
}

@Injectable()
export class ClaudeMcpSettingsTabProvider extends SettingsTabProvider {
    id = 'claude-mcp';
    icon = 'plug';
    title = t('settings.pluginTitle');

    getComponentType(): any {
        return ClaudeMcpSettingsTabComponent;
    }
}
