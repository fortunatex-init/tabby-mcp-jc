import { Component, EventEmitter, NgZone, OnDestroy, Output, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';

import { ActionResult, ClientStatus } from '../../clients/client-config';

import { ClaudeDesktopService, MCP_SERVER_KEY } from '../../clients/claude-desktop.service';

import { CodexService, CODEX_SERVER_KEY } from '../../clients/codex.service';
import { CursorService, CURSOR_SERVER_KEY } from '../../clients/cursor.service';

import { ConfirmService } from '../../services/confirm.service';
import { ConfigService } from 'tabby-core';
import { buildRemotePrompt, normalizeMcpHttpUrl } from '../../core/remote-prompt';
import { maskToken } from '../../core/token-mask';
import { readTokenMeta } from '../../core/token-meta';
import { TokenRotationService, RotateResult } from '../../services/token-rotation.service';
import { McpServerService } from '../../services/mcp-server.service';
import { McpControlService } from '../../services/mcp-control.service';
import { HttpProcessService } from '../../services/http-process.service';
import { AuditService } from '../../services/audit.service';

import { getLocalMcpUrl, readBearerToken, readHttpPort } from '../../core/http-endpoint';

import { ToastService } from '../../services/toast.service';
import { t } from '../../i18n/t';
import { MCP_UI_STYLES } from '../shared-ui-styles';
import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

type ClientPill = 'claude' | 'codex' | 'cursor' | 'other';

@Component({
    selector: 'claude-mcp-clients-tab',
    encapsulation: ViewEncapsulation.None,
    styles: [
        MCP_UI_STYLES,
        `
            .mcp-public-url-group {
                max-width: 420px;
                width: 100%;
            }
            .mcp-addr-select {
                width: auto;
                max-width: 360px;
                min-width: 12rem;
            }
            .mcp-client-pills {
                display: flex;
                flex-wrap: nowrap;
                gap: 4px;
                overflow-x: auto;
            }
            .mcp-client-pills .nav-link {
                white-space: nowrap;
                padding: 0.3rem 0.65rem;
                font-size: 13px;
            }
            .mcp-client-pills .badge {
                font-size: 10px;
            }
            .btn.btn-primary:disabled,
            .btn.btn-outline-secondary:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                box-shadow: none;
            }
        `,
    ],

    template: `
        <ul class="nav nav-pills mcp-client-pills mb-3">
            <li class="nav-item">
                <button type="button" class="nav-link" [class.active]="clientPill === 'claude'" (click)="clientPill = 'claude'">
                    Claude Desktop
                    <span class="badge ms-1"
                        [class.bg-success]="claude.installed && !claude.stale && !claude.parseError && !claude.conflict"
                        [class.bg-warning]="claude.installed && (claude.stale || claude.conflict)"
                        [class.bg-danger]="!!claude.parseError"
                        [class.bg-secondary]="!claude.installed && !claude.parseError"
                        >{{ claudePillBadge }}</span>
                </button>
            </li>
            <li class="nav-item">
                <button type="button" class="nav-link" [class.active]="clientPill === 'codex'" (click)="clientPill = 'codex'">
                    Codex
                    <span class="badge ms-1"
                        [class.bg-success]="codexStatus.installed && !codexStatus.stale && !codexStatus.parseError && !codexStatus.conflict"
                        [class.bg-warning]="codexStatus.installed && (codexStatus.stale || codexStatus.conflict)"
                        [class.bg-danger]="!!codexStatus.parseError"
                        [class.bg-secondary]="!codexStatus.installed && !codexStatus.parseError"
                        >{{ codexPillBadge }}</span>
                </button>
            </li>
            <li class="nav-item">
                <button type="button" class="nav-link" [class.active]="clientPill === 'cursor'" (click)="clientPill = 'cursor'">
                    Cursor
                    <span class="badge ms-1"
                        [class.bg-success]="cursorStatus.installed && !cursorStatus.stale && !cursorStatus.parseError && !cursorStatus.conflict"
                        [class.bg-warning]="cursorStatus.installed && (cursorStatus.stale || cursorStatus.conflict)"
                        [class.bg-danger]="!!cursorStatus.parseError"
                        [class.bg-secondary]="!cursorStatus.installed && !cursorStatus.parseError"
                        >{{ cursorPillBadge }}</span>
                </button>
            </li>
            <li class="nav-item">
                <button type="button" class="nav-link d-inline-flex align-items-center gap-1"
                    [class.active]="clientPill === 'other'" (click)="clientPill = 'other'">
                    <span class="mcp-pill-avatar other" aria-hidden="true">MCP</span>
                    {{ 'clients.otherPill' | mcpT }}
                    <span class="badge ms-1" [class.bg-success]="otherAvailable" [class.bg-secondary]="!otherAvailable"
                        >{{ otherPillBadge }}</span>
                </button>
            </li>
        </ul>

        <mcp-client-card *ngIf="clientPill === 'claude'" brand="claude"
            nameKey="clients.claudeName" subtitleKey="clients.claudeSub" title="clients.claudeTitle"
            [status]="claude" [label]="claudeLabel" [recorded]="claude.recordedShimPath || ''"
            [expected]="shimPath" parsePrefix="card.parsePrefix" [conflictText]="claudeConflict"
            [snippetLead]="claudeSnippetLead" [snippet]="claudeSnippet" [busy]="busyClaude"
            (install)="installClaude()" (remove)="uninstallClaude()" (refresh)="refreshClaude(true)">
        </mcp-client-card>

        <mcp-client-card *ngIf="clientPill === 'codex'" brand="codex"
            nameKey="clients.codexName" subtitleKey="clients.codexSub" title="clients.codexTitle"
            [status]="codexStatus" [label]="codexLabel"
            [recorded]="codexStatus.recordedEndpoint || codexStatus.recordedShimPath || ''"
            [expected]="httpMcpUrl" [conflictText]="codexConflict"
            [snippetLead]="codexSnippetLead" [snippet]="codexSnippet" [busy]="busyCodex"
            (install)="installCodex()" (remove)="uninstallCodex()" (refresh)="refreshCodex(true)">
        </mcp-client-card>

        <mcp-client-card *ngIf="clientPill === 'cursor'" brand="cursor"
            nameKey="clients.cursorName" subtitleKey="clients.cursorSub" title="clients.cursorTitle"
            [status]="cursorStatus" [label]="cursorLabel"
            [recorded]="cursorStatus.recordedEndpoint || cursorStatus.recordedShimPath || ''"
            [expected]="httpMcpUrl" [conflictText]="cursorConflict"
            [snippetLead]="cursorSnippetLead" [snippet]="cursorSnippet" [busy]="busyCursor"
            (install)="installCursor()" (remove)="uninstallCursor()" (refresh)="refreshCursor(true)">
        </mcp-client-card>

        <div class="mcp-client-card mb-0" *ngIf="clientPill === 'other'">
            <div class="mcp-client-head">
                <div class="mcp-avatar other" aria-hidden="true"><span>MCP</span></div>
                <div class="flex-grow-1 min-w-0">
                    <h5 class="mcp-client-name">{{ 'clients.otherName' | mcpT }}</h5>
                    <p class="mcp-client-sub">{{ 'clients.otherSub' | mcpT }}</p>
                </div>
                <span class="mcp-status-pill" [ngClass]="otherAvailable ? 'on' : 'off'">{{ otherStatusLabel }}</span>
            </div>

            <div class="alert alert-warning small" *ngIf="remoteHttpWarning">{{ remoteHttpWarning }}</div>
            <div class="alert alert-info small" *ngIf="!remoteHttpWarning && addressKind === 'public'">{{ 'clients.publicWarning' | mcpT }}</div>

            <div class="mcp-kv">
                <div class="k">{{ 'clients.kvAddress' | mcpT }}</div>
                <div class="v mono" [title]="selectedMcpUrl || ''">{{ selectedMcpUrl || ('clients.noAddress' | mcpT) }}</div>
                <button type="button" class="ico" [disabled]="!selectedMcpUrl" [title]="'clients.copyAddress' | mcpT" (click)="copySelectedAddress()">
                    <i class="fas fa-copy" aria-hidden="true"></i>
                </button>
            </div>
            <div class="mcp-kv mcp-kv-tail">
                <div class="k">{{ 'clients.kvAuth' | mcpT }}</div>
                <div class="v mono" [title]="authPreview">{{ authPreview }}</div>
                <button type="button" class="ico" [disabled]="!hasToken" [title]="'clients.copyAuthToken' | mcpT" (click)="copyToken()">
                    <i class="fas fa-copy" aria-hidden="true"></i>
                </button>
            </div>

            <div class="mcp-client-actions">
                <button class="btn btn-primary btn-sm" type="button" (click)="copyRemoteInfo()" [disabled]="copyRemoteDisabled">
                    {{ 'clients.copyPrompt' | mcpT }}
                </button>
                <button class="btn btn-outline-secondary btn-sm" type="button" (click)="promptPreviewOpen = !promptPreviewOpen">
                    {{ 'clients.previewPrompt' | mcpT }}
                </button>
            </div>

            <pre class="mcp-pre mcp-prompt-preview small mt-2 mb-0" *ngIf="promptPreviewOpen">{{ remotePreview }}</pre>

            <div class="mcp-link-row">
                <i class="fas fa-globe" aria-hidden="true"></i>
                <button type="button" class="btn btn-link btn-sm p-0" (click)="publicPanelOpen = !publicPanelOpen">
                    {{ 'clients.publicLink' | mcpT }}
                </button>
                <span class="small mcp-dim">{{ 'clients.publicLinkHint' | mcpT }}</span>
            </div>

            <div class="mcp-public-panel" *ngIf="publicPanelOpen">
                <div class="mb-2 d-flex align-items-center flex-wrap gap-2">
                    <label class="form-label small mb-0" for="mcp-prompt-address">{{ 'clients.promptAddress' | mcpT }}</label>
                    <select id="mcp-prompt-address" class="form-select form-select-sm mcp-addr-select"
                        [(ngModel)]="addressKind" (ngModelChange)="onAddressKindChange()">
                        <option value="loopback">{{ 'clients.addrLoopback' | mcpT: { url: loopbackUrl } }}</option>
                        <option *ngFor="let lan of lanOptions" [value]="'lan:' + lan.url">{{ 'clients.addrLan' | mcpT: { url: lan.url } }}</option>
                        <option value="public" [disabled]="!publicUrlSaved">
                            {{ 'clients.addrPublic' | mcpT: { url: publicUrlForDisplay || ('clients.publicUnset' | mcpT) } }}
                        </option>
                    </select>
                </div>
                <div class="small mcp-dim mb-2">{{ 'clients.bindPromptNote' | mcpT }}</div>
                <label class="form-label small mb-1">{{ 'clients.publicUrlLabel' | mcpT }}</label>
                <div class="input-group input-group-sm mcp-public-url-group mb-2">
                    <input class="form-control" placeholder="https://your-tunnel.example/mcp" [(ngModel)]="publicUrlDraft" />
                    <button class="btn btn-outline-secondary" type="button" (click)="savePublicUrl()">{{ 'common.save' | mcpT }}</button>
                </div>
                <div class="small mcp-dim mb-2" *ngIf="publicUrlSaved" [innerHTML]="'clients.publicSaved' | mcpT: { url: publicUrlForDisplay }"></div>
                <details class="mb-0">
                    <summary class="mcp-details-summary small" tabindex="0">{{ 'clients.howPublic' | mcpT }}</summary>
                    <div class="ps-1 mt-2">
                        <p class="small mcp-dim">{{ 'clients.howPublicBody' | mcpT }}</p>
                        <p class="small mcp-dim mb-2">{{ 'clients.publicExpose' | mcpT }}</p>
                        <h6 class="small">Cloudflare Tunnel</h6>
                        <pre class="mcp-pre small mb-2">cloudflared tunnel --url http://127.0.0.1:{{ httpPort }}</pre>
                        <p class="small mcp-dim" [innerHTML]="'clients.cloudflareHelp' | mcpT"></p>
                        <h6 class="small">Tailscale</h6>
                        <pre class="mcp-pre small mb-2">tailscale serve --bg http://127.0.0.1:{{ httpPort }}</pre>
                        <p class="small mcp-dim mb-0" [innerHTML]="'clients.tailscaleHelp' | mcpT"></p>
                    </div>
                </details>
            </div>
        </div>

        <div class="mcp-token-band mt-3">
            <div class="flex-grow-1 min-w-0">
                <div class="lab">{{ 'clients.credentials' | mcpT }}</div>
                <p class="small mcp-dim mb-2">{{ 'clients.tokenHelp' | mcpT }}</p>
                <code class="px-2 py-1 rounded border mcp-code-chip">{{ tokenPreview }}</code>
            </div>
            <div class="mcp-client-actions">
                <button class="btn btn-ghost btn-sm" type="button" (click)="tokenRevealed = !tokenRevealed">
                    {{ tokenRevealed ? ('common.hide' | mcpT) : ('common.show' | mcpT) }}
                </button>
                <button class="btn btn-primary btn-sm" type="button" (click)="copyToken()" [disabled]="!hasToken">{{ 'common.copy' | mcpT }}</button>
                <button class="btn btn-outline-danger btn-sm" type="button" (click)="rotateToken()" [disabled]="rotating || !hasToken">
                    {{ rotating ? ('clients.resetting' | mcpT) : ('clients.resetToken' | mcpT) }}
                </button>
            </div>
        </div>
        <div class="small mcp-dim mt-2" *ngIf="lastRotatedLabel">{{ 'clients.lastReset' | mcpT: { when: lastRotatedLabel } }}</div>
        <div class="alert alert-info small mt-2 mb-0" *ngIf="rotateResult">
            <div class="mcp-reset-summary">
                <strong>{{ 'clients.resetResult' | mcpT }}</strong>{{ 'clients.fingerprint' | mcpT: { fp: rotateResult.fingerprint } }}
            </div>
            <details class="mcp-reset-details">
                <summary class="mcp-details-summary" tabindex="0">{{ 'clients.resetDetails' | mcpT }}</summary>
                <div class="mt-1">
                    <div>{{ 'clients.codexStatus' | mcpT: { status: rotateResult.codex.status, message: rotateResult.codex.message } }}</div>
                    <div>{{ 'clients.cursorStatus' | mcpT: { status: rotateResult.cursor.status, message: rotateResult.cursor.message } }}</div>
                    <div>{{ 'clients.claudeStatus' | mcpT: { status: rotateResult.claude.status, message: rotateResult.claude.message } }}</div>
                    <div>{{ 'clients.remoteStatus' | mcpT: { status: rotateResult.remote.status, message: rotateResult.remote.message } }}</div>
                </div>
            </details>
        </div>
    `,

})
export class ClaudeMcpClientsTabComponent implements OnDestroy {

    @Output() changed = new EventEmitter<void>();
    @Output() openConfig = new EventEmitter<void>();

    clientPill: ClientPill = 'claude';

    claude: ClientStatus;

    codexStatus: ClientStatus;

    cursorStatus: ClientStatus;

    readonly serverKey = MCP_SERVER_KEY;

    readonly codexKey = CODEX_SERVER_KEY;

    readonly cursorKey = CURSOR_SERVER_KEY;

    tokenRevealed = false;
    rotating = false;
    rotateResult: RotateResult | null = null;
    addressKind: string = 'loopback';
    publicUrlDraft = '';
    lanOptions: Array<{ ip: string; url: string }> = [];
    promptPreviewOpen = false;
    publicPanelOpen = false;

    busyClaude = false;
    busyCodex = false;
    busyCursor = false;

    private subs = new Subscription();

    constructor(
        private claudeDesktop: ClaudeDesktopService,
        private codex: CodexService,
        private cursorClient: CursorService,
        private toast: ToastService,
        private confirm: ConfirmService,
        private config: ConfigService,
        private rotation: TokenRotationService,
        private mcp: McpServerService,
        private control: McpControlService,
        private httpProcess: HttpProcessService,
        private audit: AuditService,
        private zone: NgZone,
    ) {
        this.claude = this.claudeDesktop.status();
        this.codexStatus = this.codex.status();
        this.cursorStatus = this.cursorClient.status();
        this.lanOptions = this.listLanUrls();
        this.publicUrlDraft = (this.config.store.claudeMcp?.publicMcpUrl || '').trim();

        this.subs.add(
            this.httpProcess.changed$.subscribe(() => {
                this.zone.run(() => {
                });
            }),
        );
        this.subs.add(
            this.control.paused$.subscribe(() => {
                this.zone.run(() => {
                });
            }),
        );
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    get shimPath(): string {
        return this.claudeDesktop.shimPath;
    }

    get claudeSnippet(): string {
        return JSON.stringify(
            { [MCP_SERVER_KEY]: { command: 'node', args: [this.shimPath] } },

            null,
            2,
        );
    }

    get codexSnippet(): string {
        return this.codex.configSnippet;
    }

    get cursorSnippet(): string {
        return this.cursorClient.configSnippet;
    }

    get claudeLabel(): string {
        return this.labelOf(this.claude, {
            parseError: t('clients.parseError'),

            conflict: t('clients.nameTaken', { name: MCP_SERVER_KEY }),
        });
    }

    get codexLabel(): string {
        return this.labelOf(this.codexStatus, {
            parseError: t('clients.unhandled'),

            conflict: t('clients.sectionTaken', { name: CODEX_SERVER_KEY }),
        });
    }

    get cursorLabel(): string {
        return this.labelOf(this.cursorStatus, {
            parseError: t('clients.parseError'),
            conflict: t('clients.nameTaken', { name: CURSOR_SERVER_KEY }),
        });
    }

    get claudePillBadge(): string {
        return this.pillBadge(this.claude);
    }

    get codexPillBadge(): string {
        return this.pillBadge(this.codexStatus);
    }

    get cursorPillBadge(): string {
        return this.pillBadge(this.cursorStatus);
    }

    get claudeConflict(): string {
        return t('clients.conflictEntry', {
            name: MCP_SERVER_KEY,
        });
    }

    get codexConflict(): string {
        return t('clients.conflictSection', {
            name: CODEX_SERVER_KEY,
        });
    }

    get cursorConflict(): string {
        return t('clients.conflictMcp', {
            name: CURSOR_SERVER_KEY,
        });
    }

    get claudeSnippetLead(): string {
        return t('clients.snippetMcp', { path: this.claude.configPath });
    }

    get codexSnippetLead(): string {
        return t('clients.snippetFile', { path: this.codexStatus.configPath });
    }

    get cursorSnippetLead(): string {
        return t('clients.snippetMcp', {
            path: this.cursorStatus.configPath,
        });
    }

    refreshClaude(notify = false): void {
        this.claude = this.claudeDesktop.status();

        this.changed.emit();

        if (notify) {
            this.toast.notice(`Claude Desktop:${this.claudeLabel}`);
        }
    }

    async installClaude(): Promise<void> {
        if (this.busyClaude) return;
        const rewriting = this.claude.installed;

        const ok = await this.confirm.ask(
            rewriting ? t('clients.claude.rewriteTitle') : t('clients.claudeTitle'),

            t('clients.claude.installBody', {
                path: this.claude.configPath,
                verb: rewriting ? t('common.update') : t('common.add'),
                name: MCP_SERVER_KEY,
                shim: this.shimPath,
            }),

            rewriting ? t('card.rewrite') : t('common.connect'),
        );

        if (!ok) {
            this.toast.notice(t('clients.cancelled'));

            return;
        }

        this.busyClaude = true;
        try {
            const r = this.claudeDesktop.install();
            this.refreshClaude();
            this.report(r, t('clients.claude.connected'), t('clients.claude.failed'));
        } finally {
            this.busyClaude = false;
        }
    }

    async uninstallClaude(): Promise<void> {
        if (this.busyClaude) return;
        const ok = await this.confirm.ask(
            t('clients.claude.removeTitle'),

            t('clients.claude.removeBody', { path: this.claude.configPath, name: MCP_SERVER_KEY }),

            t('common.remove'),

            true,
        );

        if (!ok) {
            this.toast.notice(t('clients.cancelled'));

            return;
        }

        this.busyClaude = true;
        try {
            const r = this.claudeDesktop.uninstall();
            this.refreshClaude();
            this.report(r, t('clients.claude.removed'), t('clients.removeFailed'));
        } finally {
            this.busyClaude = false;
        }
    }

    refreshCodex(notify = false): void {
        this.codexStatus = this.codex.status();

        this.changed.emit();

        if (notify) {
            this.toast.notice(`Codex:${this.codexLabel}`);
        }
    }

    async installCodex(): Promise<void> {
        if (this.busyCodex) return;
        const rewriting = this.codexStatus.installed;

        const ok = await this.confirm.ask(
            rewriting ? t('clients.codex.rewriteTitle') : t('clients.codexTitle'),

            t('clients.codex.installBody', {
                path: this.codexStatus.configPath,
                verb: rewriting ? t('common.update') : t('common.add'),
                name: CODEX_SERVER_KEY,
                url: this.httpMcpUrl,
            }),

            rewriting ? t('card.rewrite') : t('common.connect'),
        );

        if (!ok) {
            this.toast.notice(t('clients.cancelled'));

            return;
        }

        this.busyCodex = true;
        try {
            const r = this.codex.install();
            this.refreshCodex();
            this.report(r, t('clients.codex.connected'), t('clients.codex.failed'));
        } finally {
            this.busyCodex = false;
        }
    }

    async uninstallCodex(): Promise<void> {
        if (this.busyCodex) return;
        const ok = await this.confirm.ask(
            t('clients.codex.removeTitle'),

            t('clients.codex.removeBody', {
                path: this.codexStatus.configPath,
                name: CODEX_SERVER_KEY,
            }),

            t('common.remove'),

            true,
        );

        if (!ok) {
            this.toast.notice(t('clients.cancelled'));

            return;
        }

        this.busyCodex = true;
        try {
            const r = this.codex.uninstall();
            this.refreshCodex();
            this.report(r, t('clients.codex.removed'), t('clients.removeFailed'));
        } finally {
            this.busyCodex = false;
        }
    }

    refreshCursor(notify = false): void {
        this.cursorStatus = this.cursorClient.status();
        this.changed.emit();
        if (notify) {
            this.toast.notice(`Cursor:${this.cursorLabel}`);
        }
    }

    async installCursor(): Promise<void> {
        if (this.busyCursor) return;
        const rewriting = this.cursorStatus.installed;
        const ok = await this.confirm.ask(
            rewriting ? t('clients.cursor.rewriteTitle') : t('clients.cursorTitle'),
            t('clients.cursor.installBody', {
                path: this.cursorStatus.configPath,
                verb: rewriting ? t('common.update') : t('common.add'),
                name: CURSOR_SERVER_KEY,
                url: this.httpMcpUrl,
            }),
            rewriting ? t('card.rewrite') : t('common.connect'),
        );
        if (!ok) {
            this.toast.notice(t('clients.cancelled'));
            return;
        }
        this.busyCursor = true;
        try {
            const r = this.cursorClient.install();
            this.refreshCursor();
            this.report(r, t('clients.cursor.connected'), t('clients.cursor.failed'));
        } finally {
            this.busyCursor = false;
        }
    }

    async uninstallCursor(): Promise<void> {
        if (this.busyCursor) return;
        const ok = await this.confirm.ask(
            t('clients.cursor.removeTitle'),
            t('clients.cursor.removeBody', {
                path: this.cursorStatus.configPath,
                name: CURSOR_SERVER_KEY,
            }),
            t('common.remove'),
            true,
        );
        if (!ok) {
            this.toast.notice(t('clients.cancelled'));
            return;
        }
        this.busyCursor = true;
        try {
            const r = this.cursorClient.uninstall();
            this.refreshCursor();
            this.report(r, t('clients.cursor.removed'), t('clients.removeFailed'));
        } finally {
            this.busyCursor = false;
        }
    }

    get hasToken(): boolean {
        return !!(this.mcp.getTokenPlain() || readBearerToken());
    }

    get tokenPlain(): string {
        return this.mcp.getTokenPlain() || readBearerToken() || '';
    }

    get tokenPreview(): string {
        const token = this.tokenPlain;
        if (!token) return t('clients.noTokenYet');
        return this.tokenRevealed ? token : maskToken(token);
    }

    get lastRotatedLabel(): string {
        const m = readTokenMeta();
        if (!m.lastRotatedAt) return '';
        try {
            return new Date(m.lastRotatedAt).toLocaleString();
        } catch {
            return String(m.lastRotatedAt);
        }
    }

    get loopbackUrl(): string {
        return getLocalMcpUrl(readHttpPort());
    }

    get httpMcpUrl(): string {
        return this.loopbackUrl;
    }

    get publicUrlSaved(): string {
        return (this.config.store.claudeMcp?.publicMcpUrl || '').trim();
    }

    get selectedMcpUrl(): string {
        let raw: string;
        if (this.addressKind === 'loopback') raw = this.loopbackUrl;
        else if (this.addressKind === 'public')
            raw = this.publicUrlSaved || this.publicUrlDraft.trim();
        else if (this.addressKind.startsWith('lan:')) raw = this.addressKind.slice(4);
        else raw = this.loopbackUrl;
        return normalizeMcpHttpUrl(raw);
    }

    get publicUrlForDisplay(): string {
        const raw = this.publicUrlSaved;
        return raw ? normalizeMcpHttpUrl(raw) : '';
    }

    get copyRemoteDisabled(): boolean {
        return this.control.paused || this.httpProcess.status !== 'running';
    }

    get otherAvailable(): boolean {
        return !this.control.paused && this.httpProcess.status === 'running';
    }

    get otherPillBadge(): string {
        return this.otherAvailable ? t('clients.otherAvailable') : t('clients.otherUnavailable');
    }

    get otherStatusLabel(): string {
        return this.otherPillBadge;
    }

    get authPreview(): string {
        const token = this.tokenPlain;
        if (!token) return t('clients.noTokenYet');
        const shown = this.tokenRevealed ? token : maskToken(token);
        return `Bearer ${shown}`;
    }

    get remoteHttpWarning(): string {
        if (this.control.paused) {
            return t('clients.pausedWarning');
        }
        if (this.httpProcess.status === 'error') {
            const msg = this.httpProcess.statusMessage;
            return msg
                ? t('clients.httpErrorDetail', { detail: msg })
                : t('clients.httpError');
        }
        if (this.httpProcess.status !== 'running') {
            return t('clients.httpDown');
        }
        return '';
    }

    get remotePreview(): string {
        const tok = this.tokenPlain || '<YOUR_TOKEN>';
        const shown = this.tokenRevealed ? tok : maskToken(tok);
        return buildRemotePrompt({
            mcpUrl: this.selectedMcpUrl || t('clients.noAddress'),
            token: shown,
            includeToken: true,
        });
    }

    get httpBindHost(): string {
        const v = this.config.store.claudeMcp?.httpBindHost;
        return v === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
    }

    get bindSummary(): string {
        const port = this.httpPort;
        return this.httpBindHost === '0.0.0.0'
            ? t('clients.bindSummaryLan', { port })
            : t('clients.bindSummaryLoopback', { port });
    }

    get httpPort(): number {
        return readHttpPort();
    }

    get httpStatusLabel(): string {
        const base =
            {
                running: t('settings.httpRunning'),
                stopped: t('settings.httpIdle'),
                starting: t('settings.httpStarting'),
                error: t('settings.httpError'),
            }[this.httpProcess.status] ?? this.httpProcess.status;
        const msg = this.httpProcess.statusMessage;
        if (!msg) return base;
        return `${base} — ${t(msg)}`;
    }

    onAddressKindChange(): void {

    }

    savePublicUrl(): void {
        const u = this.publicUrlDraft.trim();
        this.config.store.claudeMcp.publicMcpUrl = u;
        void this.config.save();
        if (u) {
            this.addressKind = 'public';
            this.toast.success(t('clients.publicSavedToast'));
        } else {
            this.addressKind = 'loopback';
            this.toast.notice(t('clients.publicCleared'));
        }
    }

    listLanUrls(): Array<{ ip: string; url: string }> {
        const port = readHttpPort();
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const os = require('os') as typeof import('os');
            const rows = flatMap(os.networkInterfaces(), infos =>
                (infos || [])
                    .filter(
                        info =>
                            (info.family === 'IPv4' || (info.family as any) === 4) &&
                            !info.internal,
                    )
                    .map(info => {
                        const url = `http://${info.address}:${port}/mcp`;
                        return { ip: info.address, url };
                    }),
            );
            return sortBy(uniqBy(rows, 'ip'), 'ip');
        } catch {
            return [];
        }
    }

    async copyToken(): Promise<void> {
        const token = this.tokenPlain;
        if (!token) {
            this.toast.notice(t('clients.noToken'));
            return;
        }
        const ok = await this.copyText(token);
        if (ok) this.toast.success(t('clients.tokenCopied'));
        else this.toast.notice(t('common.copyFailed'));
    }

    async rotateToken(): Promise<void> {
        if (this.rotating) return;
        const plan = this.rotation.previewClients();
        const body = [
            t('clients.oldTokenDies'),
            '',
            t('clients.rotateCodex', { label: plan.codex.label, detail: plan.codex.detail }),
            t('clients.rotateCursor', {
                label: plan.cursor.label,
                detail: plan.cursor.detail,
            }),
            t('clients.rotateClaude', {
                label: plan.claude.label,
                detail: plan.claude.detail,
            }),
            t('clients.rotateRemote', { detail: plan.remote.detail }),
            '',
            t('common.continue'),
        ].join('\n');
        const ok = await this.confirm.ask(
            t('clients.resetToken'),
            body,
            t('clients.confirmReset'),
            true,
        );
        if (!ok) return;
        this.rotating = true;
        this.rotateResult = null;
        try {
            this.rotateResult = await this.rotation.rotate();
            if (this.rotateResult.ok) {
                this.toast.success(
                    t('clients.tokenReset'),
                    t('clients.fingerprintToast', { fp: this.rotateResult.fingerprint }),
                );
            } else {
                this.toast.error(this.rotateResult.error || t('clients.resetFailed'));
            }
        } catch (e: any) {
            this.toast.error(e?.message || String(e));
        } finally {
            this.rotating = false;
            this.tokenRevealed = false;
        }
    }

    async copySelectedAddress(): Promise<void> {
        if (!this.selectedMcpUrl) {
            this.toast.notice(t('clients.needAddress'));
            return;
        }
        const ok = await this.copyText(this.selectedMcpUrl);
        if (ok) this.toast.success(t('clients.addressCopied'));
        else this.toast.notice(t('common.copyFailed'));
    }

    async copyRemoteInfo(): Promise<void> {
        if (this.copyRemoteDisabled) {
            this.toast.notice(this.remoteHttpWarning || t('clients.httpDown'));
            return;
        }
        if (!this.selectedMcpUrl) {
            this.toast.notice(t('clients.needAddress'));
            return;
        }
        const text = buildRemotePrompt({
            mcpUrl: this.selectedMcpUrl,
            token: this.tokenPlain,
            includeToken: true,
        });
        const ok = await this.copyText(text);
        if (ok) {
            this.toast.success(t('clients.copiedWithToken'), t('clients.remoteNote'));
            try {
                this.audit.write({
                    tool: 'copy_remote_prompt',
                    result: 'ok',
                    explanation: 'with_token',
                    text: this.selectedMcpUrl,
                });
            } catch {
            }
        } else {
            this.toast.notice(t('common.copyFailedManual'));
        }
    }

    private async copyText(text: string): Promise<boolean> {
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);

                return true;
            }
        } catch {
        }

        try {
            const { clipboard } = require('electron');

            await clipboard.writeText(text);

            return true;
        } catch {
            return false;
        }
    }

    private pillBadge(s: ClientStatus): string {
        if (s.parseError) return t('clients.parseError');
        if (s.conflict) return t('clients.pillConflict');
        if (s.installed && s.stale) return t('clients.stale');
        if (s.installed) return t('clients.connected');
        return t('clients.notConnected');
    }

    private labelOf(s: ClientStatus, text: { parseError: string; conflict: string }): string {
        if (s.parseError) {
            return text.parseError;
        }

        if (s.conflict) {
            return text.conflict;
        }

        if (s.installed && s.stale) {
            return t('clients.stale');
        }

        if (s.installed) {
            return t('clients.connected');
        }

        if (!s.configExists) {
            return t('clients.notConnectedYet');
        }

        return t('clients.notConnected');
    }

    private report(r: ActionResult, okTitle: string, failTitle: string): void {
        if (r.ok) {
            this.toast.success(r.message, okTitle);
        } else {
            this.toast.error(r.message, failTitle);
        }
    }
}
