import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Injectable } from '@angular/core';

import {
    ActionResult,
    BACKUP_SUFFIX,
    ClientStatus,
    OWNERSHIP_MARKER,
    isOurPath,
    sameUrl,
    writeConfigFile,
} from './client-config';
import { getLocalMcpUrl, readBearerToken, readHttpPort } from '../core/http-endpoint';
import { t } from '../i18n/t';

export const CODEX_SERVER_KEY = 'tabby';

const OUR_HEADER = /^[ \t]*\[[ \t]*mcp_servers[ \t]*\.[ \t]*"?tabby"?[ \t]*][ \t]*(?:#.*)?$/;

const ANY_HEADER = /^[ \t]*\[\[?[^\][]*]]?[ \t]*(?:#.*)?$/;

export type CodexStatus = ClientStatus;

interface Section {
    start: number;
    end: number;
    body: string;
}

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

        let lines: string[];
        try {
            lines = this.read(configPath).lines;
        } catch (e: any) {
            s.parseError = e.message;
            return s;
        }

        if (lines.filter(l => OUR_HEADER.test(l)).length > 1) {
            s.parseError = `配置里有多个 [mcp_servers.${CODEX_SERVER_KEY}] 段,TOML 不允许重复定义`;
            return s;
        }

        const section = this.findSection(lines);
        if (!section) {
            return s;
        }
        if (!this.isOurs(section.body)) {
            s.conflict = true;
            return s;
        }

        s.installed = true;
        s.recordedEndpoint = this.extractUrl(section.body) ?? this.extractShimPath(section.body);
        s.recordedShimPath = s.recordedEndpoint;
        const currentUrl = this.mcpUrl;
        if (this.extractShimPath(section.body) && !this.extractUrl(section.body)) {
            s.stale = true;
        } else {
            s.stale = !sameUrl(s.recordedEndpoint, currentUrl);
        }
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

        const { lines, eol } = this.split(raw);

        if (lines.filter(l => OUR_HEADER.test(l)).length > 1) {
            return {
                ok: false,
                message: t('install.codexDuplicate', { name: CODEX_SERVER_KEY }),
            };
        }

        const section = this.findSection(lines);
        if (section && !this.isOurs(section.body)) {
            return {
                ok: false,
                message: t('install.codexForeign', { name: CODEX_SERVER_KEY }),
            };
        }

        const rendered = this.renderSection();
        let next: string[];
        if (section) {
            next = [...lines.slice(0, section.start), ...rendered, ...lines.slice(section.end)];
        } else {
            next = [...lines];
            while (next.length && !next[next.length - 1].trim()) {
                next.pop();
            }
            if (next.length) {
                next.push('');
            }
            next.push(...rendered);
        }

        while (next.length && !next[next.length - 1].trim()) {
            next.pop();
        }
        next.push('');

        const text = next.join(eol);

        const check = this.findSection(this.split(text).lines);
        if (
            !check ||
            !this.isOurs(check.body) ||
            !sameUrl(this.extractUrl(check.body), this.mcpUrl)
        ) {
            return {
                ok: false,
                message: t('install.unrecognized'),
            };
        }

        const written = writeConfigFile(configPath, text);
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

        const { lines, eol } = this.split(raw);
        const section = this.findSection(lines);
        if (!section) {
            return { ok: true, message: t('install.notPresent') };
        }
        if (!this.isOurs(section.body)) {
            return {
                ok: false,
                message: t('install.codexNotOurs', {
                    name: CODEX_SERVER_KEY,
                }),
            };
        }

        const next = [...lines.slice(0, section.start), ...lines.slice(section.end)];
        while (next.length && !next[next.length - 1].trim()) {
            next.pop();
        }
        const text = next.length ? next.join(eol) + eol : '';

        if (this.findSection(this.split(text).lines)) {
            return {
                ok: false,
                message: t('install.stillThere'),
            };
        }

        const written = writeConfigFile(configPath, text);
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
        return this.renderSection().join('\n');
    }

    private read(p: string): { lines: string[]; eol: string } {
        return this.split(fs.readFileSync(p, 'utf8'));
    }

    private split(raw: string): { lines: string[]; eol: string } {
        return {
            lines: raw.length ? raw.split(/\r?\n/) : [],
            eol: raw.includes('\r\n') ? '\r\n' : '\n',
        };
    }

    private findSection(lines: string[]): Section | null {
        const start = lines.findIndex(l => OUR_HEADER.test(l));
        if (start < 0) {
            return null;
        }
        let end = lines.length;
        for (let i = start + 1; i < lines.length; i++) {
            if (ANY_HEADER.test(lines[i])) {
                end = i;
                break;
            }
        }
        return { start, end, body: lines.slice(start, end).join('\n') };
    }

    private renderSection(): string[] {
        const url = this.mcpUrl;
        const token = this.bearerToken || 'REPLACE_WITH_TOKEN';
        return [
            `[mcp_servers.${CODEX_SERVER_KEY}]`,
            `# ${OWNERSHIP_MARKER}`,
            `url = ${this.quote(url)}`,
            `http_headers = { Authorization = ${this.quote('Bearer ' + token)} }`,
        ];
    }

    private isOurs(body: string): boolean {
        if (body.includes(OWNERSHIP_MARKER) || body.includes('tabby-claude-mcp')) {
            return true;
        }
        if (this.extractShimPath(body)) {
            return true;
        }
        const url = this.extractUrl(body);
        return typeof url === 'string' && /127\.0\.0\.1:\d+\/mcp/.test(url);
    }

    private extractUrl(body: string): string | undefined {
        const m = /(?:^|\n)[ \t]*url[ \t]*=[ \t]*("(?:[^"\\]|\\.)*")/m.exec(body);
        if (!m) {
            return undefined;
        }
        return this.unquote(m[1]);
    }

    private extractShimPath(body: string): string | undefined {
        const strings = body.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
        for (const s of strings) {
            const v = this.unquote(s);
            if (isOurPath(v) && /shim\.js|http-server\.js/.test(v)) {
                return v;
            }
        }
        return undefined;
    }

    private quote(v: string): string {
        return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }

    private unquote(s: string): string {
        return s.slice(1, -1).replace(/\\(.)/g, (_, c: string) => {
            if (c === 'n') {
                return '\n';
            }
            if (c === 't') {
                return '\t';
            }
            return c;
        });
    }
}
