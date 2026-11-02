import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Injectable } from '@angular/core';

import {
    ActionResult,
    BACKUP_SUFFIX,
    ClientStatus,
    isOurPath,
    samePath,
    writeConfigFile,
} from './client-config';
import { t } from '../i18n/t';

export const MCP_SERVER_KEY = 'tabby';

export type ClaudeDesktopStatus = ClientStatus;

@Injectable({ providedIn: 'root' })
export class ClaudeDesktopService {
    get configPath(): string {
        if (process.platform === 'win32') {
            const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
            return path.join(appData, 'Claude', 'claude_desktop_config.json');
        }
        if (process.platform === 'darwin') {
            return path.join(
                os.homedir(),
                'Library',
                'Application Support',
                'Claude',
                'claude_desktop_config.json',
            );
        }
        const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        return path.join(xdg, 'Claude', 'claude_desktop_config.json');
    }

    get shimPath(): string {
        return path.join(__dirname, 'shim.js');
    }

    get backupPath(): string {
        return this.configPath + BACKUP_SUFFIX;
    }

    status(): ClaudeDesktopStatus {
        const configPath = this.configPath;
        const s: ClaudeDesktopStatus = {
            configPath,
            configExists: fs.existsSync(configPath),
            installed: false,
            stale: false,
            conflict: false,
        };
        if (!s.configExists) {
            return s;
        }

        let json: any;
        try {
            json = this.readJson(configPath);
        } catch (e: any) {
            s.parseError = e.message;
            return s;
        }

        const entry = json?.mcpServers?.[MCP_SERVER_KEY];
        if (!entry) {
            return s;
        }
        if (!this.isOurs(entry)) {
            s.conflict = true;
            return s;
        }

        s.installed = true;
        s.recordedShimPath = (entry.args ?? []).find(isOurPath);
        s.stale = !samePath(s.recordedShimPath, this.shimPath);
        return s;
    }

    install(): ActionResult {
        const configPath = this.configPath;

        let json: any = {};
        if (fs.existsSync(configPath)) {
            try {
                json = this.readJson(configPath);
            } catch (e: any) {
                return {
                    ok: false,
                    message: t('install.badJson', {
                        err: e.message,
                    }),
                };
            }
        }

        if (typeof json !== 'object' || json === null || Array.isArray(json)) {
            return { ok: false, message: t('install.notObjectAbort') };
        }
        if (
            json.mcpServers &&
            (typeof json.mcpServers !== 'object' || Array.isArray(json.mcpServers))
        ) {
            return { ok: false, message: t('install.mcpNotObjectAbort') };
        }
        json.mcpServers = json.mcpServers ?? {};

        const existing = json.mcpServers[MCP_SERVER_KEY];
        if (existing && !this.isOurs(existing)) {
            return {
                ok: false,
                message: t('install.mcpForeign', { name: MCP_SERVER_KEY }),
            };
        }

        json.mcpServers[MCP_SERVER_KEY] = {
            command: 'node',
            args: [this.shimPath],
        };

        const written = this.commitJson(configPath, json);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.claudeWrote', {
                path: configPath,
                backup: this.backupNote(written.backupPath),
            }),
        };
    }

    uninstall(): ActionResult {
        const configPath = this.configPath;
        if (!fs.existsSync(configPath)) {
            return { ok: true, message: t('install.noFile') };
        }

        let json: any;
        try {
            json = this.readJson(configPath);
        } catch (e: any) {
            return {
                ok: false,
                message: t('install.badJsonAbort', { err: e.message }),
            };
        }

        const entry = json?.mcpServers?.[MCP_SERVER_KEY];
        if (!entry) {
            return { ok: true, message: t('install.notPresent') };
        }
        if (!this.isOurs(entry)) {
            return {
                ok: false,
                message: t('install.entryNotOurs', {
                    name: MCP_SERVER_KEY,
                }),
            };
        }

        delete json.mcpServers[MCP_SERVER_KEY];

        const written = this.commitJson(configPath, json);
        if (!written.ok) return written;

        return {
            ok: true,
            message: t('install.claudeRemoved', {
                path: configPath,
                backup: this.backupNote(written.backupPath),
            }),
        };
    }

    private readJson(p: string): any {
        const raw = fs.readFileSync(p, 'utf8');
        return raw.trim() ? JSON.parse(raw) : {};
    }

    private isOurs(entry: any): boolean {
        return Array.isArray(entry?.args) && entry.args.some(isOurPath);
    }

    private commitJson(p: string, json: any): ActionResult & { backupPath: string | null } {
        let text: string;
        try {
            text = JSON.stringify(json, null, 2);
            JSON.parse(text);
        } catch (e: any) {
            return {
                ok: false,
                message: t('install.writeFailed', { err: e.message }),
                backupPath: null,
            };
        }
        return writeConfigFile(p, text);
    }

    private backupNote(backupPath: string | null): string {
        return backupPath ? t('install.backedUp', { path: backupPath }) : '';
    }
}
