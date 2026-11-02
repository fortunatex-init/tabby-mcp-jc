import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { Injectable } from '@angular/core';

import { applyCodexBearerReset } from '../core/codex-bearer';
import { applyCursorBearerReset } from '../core/cursor-mcp';
import { getLocalMcpUrl, readBearerToken, readHttpPort } from '../core/http-endpoint';
import { getTokenPath } from '../core/paths';
import { tokenFingerprint } from '../core/token-mask';
import { writeTokenMeta } from '../core/token-meta';
import { ClaudeDesktopService } from '../clients/claude-desktop.service';
import { CodexService } from '../clients/codex.service';
import { CursorService } from '../clients/cursor.service';
import { McpServerService } from './mcp-server.service';
import { HttpProcessService } from './http-process.service';
import { McpControlService } from './mcp-control.service';
import { AuditService } from './audit.service';
import { t } from '../i18n/t';

export type RotateClientStatus = 'updated' | 'skipped' | 'failed' | 'manual';

export interface RotateClientPlan {
    connected: boolean;
    label: string;
    detail: string;
}

export interface RotateResult {
    ok: boolean;
    fingerprint: string;
    rotatedAt: number;
    codex: { status: RotateClientStatus; message: string };
    cursor: { status: RotateClientStatus; message: string };
    claude: { status: RotateClientStatus; message: string };
    remote: { status: RotateClientStatus; message: string };
    error?: string;
}

@Injectable({ providedIn: 'root' })
export class TokenRotationService {
    private busy = false;

    constructor(
        private mcp: McpServerService,
        private http: HttpProcessService,
        private codex: CodexService,
        private cursor: CursorService,
        private claudeDesktop: ClaudeDesktopService,
        private control: McpControlService,
        private audit: AuditService,
    ) {}

    get rotating(): boolean {
        return this.busy;
    }

    previewClients(): {
        codex: RotateClientPlan;
        cursor: RotateClientPlan;
        claude: RotateClientPlan;
        remote: RotateClientPlan;
    } {
        const cs = this.codex.status();
        const codexConnected = !!(cs.configExists && cs.installed && !cs.conflict);
        const cursorStatus = this.cursor.status();
        const cursorConnected = !!(
            cursorStatus.configExists &&
            cursorStatus.installed &&
            !cursorStatus.conflict
        );
        const claude = this.claudeDesktop.status();
        const claudeConnected = !!(claude.configExists && claude.installed && !claude.conflict);
        return {
            codex: {
                connected: codexConnected,
                label: codexConnected ? t('clients.connected') : t('clients.notConnected'),
                detail: codexConnected ? t('rotate.willUpdateBearer') : t('rotate.wontEdit'),
            },
            cursor: {
                connected: cursorConnected,
                label: cursorConnected ? t('clients.connected') : t('clients.notConnected'),
                detail: cursorConnected ? t('rotate.willUpdateCursor') : t('rotate.wontEdit'),
            },
            claude: {
                connected: claudeConnected,
                label: claudeConnected ? t('clients.connected') : t('clients.notConnected'),
                detail: claudeConnected ? t('rotate.claudeFile') : t('rotate.wontEdit'),
            },
            remote: {
                connected: false,
                label: t('common.remote'),
                detail: t('rotate.updateBearer'),
            },
        };
    }

    async rotate(opts?: {
        codexConfigPath?: string;
        cursorConfigPath?: string;
        expectedUrl?: string;
        oldToken?: string;
    }): Promise<RotateResult> {
        if (this.busy) {
            return {
                ok: false,
                fingerprint: '',
                rotatedAt: Date.now(),
                codex: { status: 'skipped', message: t('rotate.inProgress') },
                cursor: { status: 'skipped', message: t('rotate.inProgress') },
                claude: { status: 'skipped', message: t('rotate.inProgress') },
                remote: { status: 'skipped', message: t('rotate.inProgress') },
                error: 'rotate_in_progress',
            };
        }
        this.busy = true;
        const rotatedAt = Date.now();
        try {
            const oldToken = opts?.oldToken !== undefined ? opts.oldToken : readBearerToken();
            const expectedUrl = opts?.expectedUrl || getLocalMcpUrl(readHttpPort());

            const newToken = randomBytes(32).toString('hex');
            const fp = tokenFingerprint(newToken);

            const tokenPath = getTokenPath();
            fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
            fs.writeFileSync(tokenPath, newToken, { encoding: 'utf8', mode: 0o600 });
            try {
                if (process.platform !== 'win32') fs.chmodSync(tokenPath, 0o600);
            } catch {
            }

            this.mcp.applyRotatedToken(newToken);

            try {
                void this.http.restartServing();
            } catch (e: any) {
                this.control.record('rotate_token', `HTTP 重启跳过: ${e?.message || e}`);
            }

            const codexResult = this.applyBearerReset(
                opts?.codexConfigPath || this.codex.configPath,
                p => applyCodexBearerReset(p, { newToken, oldToken, expectedUrl }),
            );
            const cursorResult = this.applyBearerReset(
                opts?.cursorConfigPath || this.cursor.configPath,
                p => applyCursorBearerReset(p, { newToken, oldToken, expectedUrl }),
            );

            const claudeStatus = this.claudeDesktop.status();
            const claudeConnected = !!(
                claudeStatus.configExists &&
                claudeStatus.installed &&
                !claudeStatus.conflict
            );
            const claudeResult = claudeConnected
                ? {
                      status: 'updated' as RotateClientStatus,
                      message: t('rotate.claudeAuto'),
                  }
                : {
                      status: 'skipped' as RotateClientStatus,
                      message: t('rotate.notConnected'),
                  };

            const remoteResult = {
                status: 'manual' as RotateClientStatus,
                message: t('rotate.manualRemote'),
            };

            writeTokenMeta({ lastRotatedAt: rotatedAt, fingerprint: fp });

            try {
                this.audit.write({
                    tool: 'rotate_token',
                    result: 'ok',
                    command: `fingerprint=${fp}`,
                } as any);
            } catch {

            }

            this.control.record('rotate_token', `已重置 Token (${fp})`);

            return {
                ok: true,
                fingerprint: fp,
                rotatedAt,
                codex: codexResult,
                cursor: cursorResult,
                claude: claudeResult,
                remote: remoteResult,
            };
        } catch (e: any) {
            return {
                ok: false,
                fingerprint: '',
                rotatedAt,
                codex: { status: 'failed', message: e?.message || String(e) },
                cursor: { status: 'skipped', message: '' },
                claude: { status: 'skipped', message: '' },
                remote: { status: 'manual', message: t('rotate.manual') },
                error: e?.message || String(e),
            };
        } finally {
            this.busy = false;
        }
    }

    private applyBearerReset(
        configPath: string,
        apply: (configPath: string) => {
            ok: boolean;
            wrote: boolean;
            status: string;
            message: string;
        },
    ): { status: RotateClientStatus; message: string } {
        const r = apply(configPath);
        if (r.ok && r.wrote) {
            return { status: 'updated', message: r.message };
        }
        if (r.status.startsWith('skipped_')) {
            return { status: 'skipped', message: r.message };
        }
        return { status: 'failed', message: r.message };
    }
}
