import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Injectable } from '@angular/core';

import { ActionResult, BACKUP_SUFFIX, ClientStatus, writeConfigFile } from './client-config';
import { getLocalMcpUrl, readBearerToken, readHttpPort } from '../core/http-endpoint';
import { t } from '../i18n/t';
import {
    CURSOR_SERVER_KEY,
    buildCursorEntry,
    inspectCursorConfig,
    renderCursorInstall,
    renderCursorUninstall,
} from '../core/cursor-mcp';

export { CURSOR_SERVER_KEY };

@Injectable({ providedIn: 'root' })
export class CursorService {
    get configPath(): string {
        return path.join(os.homedir(), '.cursor', 'mcp.json');
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

    get configSnippet(): string {
        const token = this.bearerToken || 'REPLACE_WITH_TOKEN';
        return JSON.stringify(
            { [CURSOR_SERVER_KEY]: buildCursorEntry(this.mcpUrl, token) },
            null,
            2,
        );
    }

    status(): ClientStatus {
        const configPath = this.configPath;
        const s: ClientStatus = {
            configPath,
            configExists: fs.existsSync(configPath),
            installed: false,
            stale: false,
            conflict: false,
        };
        if (!s.configExists) return s;

        let raw: string;
        try {
            raw = fs.readFileSync(configPath, 'utf8');
        } catch (e: any) {
            s.parseError = e.message;
            return s;
        }

        const inspected = inspectCursorConfig(raw, this.mcpUrl);
        if (inspected.kind === 'parse_error' || inspected.kind === 'invalid') {
            s.parseError = inspected.message;
            return s;
        }
        if (inspected.kind === 'conflict') {
            s.conflict = true;
            return s;
        }
        if (inspected.kind === 'installed') {
            s.installed = true;
            s.recordedEndpoint = inspected.recordedEndpoint;
            s.recordedShimPath = inspected.recordedEndpoint;
            s.stale = !!inspected.stale;
        }
        return s;
    }

    install(): ActionResult {
        const token = this.bearerToken;
        if (!token) {
            return {
                ok: false,
                message: t('install.noToken'),
            };
        }

        const configPath = this.configPath;
        const exists = fs.existsSync(configPath);
        let raw = '';
        if (exists) {
            try {
                raw = fs.readFileSync(configPath, 'utf8');
            } catch (e: any) {
                return {
                    ok: false,
                    message: t('install.readFailed', { err: e.message }),
                };
            }
        }

        const rendered = renderCursorInstall(raw, this.mcpUrl, token);
        if (!rendered.ok) return rendered;

        const check = inspectCursorConfig(rendered.text, this.mcpUrl);
        if (check.kind !== 'installed' || check.stale) {
            return {
                ok: false,
                message: t('install.unrecognized'),
            };
        }

        const written = writeConfigFile(configPath, rendered.text);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.cursorWrote', {
                path: configPath,
                backup: written.backupPath
                    ? t('install.backedUp', { path: written.backupPath })
                    : '',
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

        const rendered = renderCursorUninstall(raw);
        if (!rendered.ok) return rendered;
        if (!rendered.removed) {
            return { ok: true, message: t('install.notPresent') };
        }

        const check = inspectCursorConfig(rendered.text, this.mcpUrl);
        if (check.kind === 'installed' || check.kind === 'conflict') {
            return {
                ok: false,
                message: t('install.stillThere'),
            };
        }

        const written = writeConfigFile(configPath, rendered.text);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.cursorRemoved', {
                path: configPath,
                backup: written.backupPath
                    ? t('install.backedUp', { path: written.backupPath })
                    : '',
            }),
        };
    }
}
