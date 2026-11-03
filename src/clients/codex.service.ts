import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Injectable } from '@angular/core';

import {
    ActionResult,
    BACKUP_SUFFIX,
    ClientStatus,
    writeConfigFile,
} from './client-config';
import {
    CODEX_SERVER_KEY,
    inspectCodexConfig,
    renderCodexInstall,
    renderCodexSection,
    renderCodexUninstall,
} from '../core/codex-config';
import { getLocalMcpUrl, readBearerToken, readHttpPort } from '../core/http-endpoint';
import { t } from '../i18n/t';

export { CODEX_SERVER_KEY };

export type CodexStatus = ClientStatus;

@Injectable({ providedIn: 'root' })
export class CodexService {
    get configPath(): string {
        const home = process.env.CODEX_HOME;
        if (home) {
            return path.join(home, 'config.toml');
        }
        return path.join(os.homedir(), '.codex', 'config.toml');
    }

    get httpServerPath(): string {
        return path.join(__dirname, 'http-server.js');
    }

    get shimPath(): string {
        return this.httpServerPath;
    }

    get mcpUrl(): string {
        return getLocalMcpUrl(readHttpPort());
    }

    get bearerToken(): string {
        return readBearerToken();
    }

    get backupPath(): string {
        return this.configPath + BACKUP_SUFFIX;
    }

    status(): CodexStatus {
        const configPath = this.configPath;
        const s: CodexStatus = {
            configPath,
            configExists: fs.existsSync(configPath),
            installed: false,
            stale: false,
            conflict: false,
        };
        if (!s.configExists) {
            return s;
        }

        let raw: string;
        try {
            raw = fs.readFileSync(configPath, 'utf8');
        } catch (e: any) {
            s.parseError = e.message;
            return s;
        }

        const inspected = inspectCodexConfig(raw, this.mcpUrl);
        s.installed = inspected.installed;
        s.orphans = inspected.orphans;
        s.stale = inspected.stale;
        s.conflict = inspected.conflict;
        s.parseError = inspected.parseError;
        s.recordedEndpoint = inspected.recordedEndpoint;
        s.recordedShimPath = inspected.recordedEndpoint;
        return s;
    }

    install(): ActionResult {
        const configPath = this.configPath;
        const token = this.bearerToken;
        if (!token) {
            return {
                ok: false,
                message: t('install.noToken'),
            };
        }

        let raw = '';
        if (fs.existsSync(configPath)) {
            try {
                raw = fs.readFileSync(configPath, 'utf8');
            } catch (e: any) {
                return {
                    ok: false,
                    message: t('install.readFailed', { err: e.message }),
                };
            }
        }

        const rewritten = renderCodexInstall(raw, this.mcpUrl, token);
        if (!rewritten.ok) {
            return { ok: false, message: rewritten.message };
        }

        const written = writeConfigFile(configPath, rewritten.text);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.codexWrote', {
                path: configPath,
                backup: written.backupPath
                    ? t('install.backedUp', { path: written.backupPath })
                    : '',
                server: this.httpServerPath,
            }),
        };
    }

    uninstall(): ActionResult {
        const configPath = this.configPath;
        if (!fs.existsSync(configPath)) {
            return { ok: true, message: t('install.noFile') };
        }

        let raw: string;
        try {
            raw = fs.readFileSync(configPath, 'utf8');
        } catch (e: any) {
            return {
                ok: false,
                message: t('install.readFailed', { err: e.message }),
            };
        }

        const rewritten = renderCodexUninstall(raw);
        if (!rewritten.ok) {
            return { ok: false, message: rewritten.message };
        }
        if (!rewritten.removed) {
            return { ok: true, message: rewritten.message || t('install.notPresent') };
        }

        const written = writeConfigFile(configPath, rewritten.text);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.codexRemoved', {
                path: configPath,
                backup: written.backupPath
                    ? t('install.backedUp', { path: written.backupPath })
                    : '',
            }),
        };
    }

    get configSnippet(): string {
        return renderCodexSection(this.mcpUrl, this.bearerToken).join('\n');
    }
}
