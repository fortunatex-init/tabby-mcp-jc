import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ConfigService } from 'tabby-core';

import { auditDayStamp, getAuditPath, getLegacyAuditPath, getStateDir } from '../core/paths';

const RETENTION_DAYS = 30;

const DATED_LOG = /^audit-(\d{4}-\d{2}-\d{2})\.log$/;

export interface AuditEntry {
    tool: string;
    tabId?: string;
    tabTitle?: string;
    text?: string;
    explanation?: string;
    confirmed?: boolean;
    whitelisted?: boolean;
    matchedRule?: string;
    result: 'ok' | 'denied' | 'error';
    error?: string;
    feedback?: string;
    caller?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
    private warned = false;
    private cleanedOn = '';
    private changed = new Subject<void>();

    readonly changed$: Observable<void> = this.changed.asObservable();

    constructor(private config: ConfigService) {}

    write(entry: AuditEntry): void {
        if (this.config.store?.claudeMcp?.auditLog === false) {
            return;
        }
        const day = auditDayStamp();
        let written = false;
        try {
            fs.mkdirSync(getStateDir(), { recursive: true });
            const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
            fs.appendFileSync(getAuditPath(day), line, 'utf8');
            written = true;
        } catch (e) {
            if (!this.warned) {
                this.warned = true;
                console.warn('[tabby-mcp-jc] 审计日志写入失败,后续不再提示:', e);
            }
        }
        this.maybePrune(day);

        if (written) {
            this.changed.next();
        }
    }

    tail(lines = 50): AuditEntry[] {
        const out: AuditEntry[] = [];
        for (const file of this.logFiles()) {
            let raw: string;
            try {
                raw = fs.readFileSync(file, 'utf8');
            } catch {
                continue;
            }
            const parsed = raw
                .split('\n')
                .filter(l => l.trim())
                .map(l => {
                    try {
                        return JSON.parse(l);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean) as AuditEntry[];
            out.unshift(...parsed);
            if (out.length >= lines) {
                break;
            }
        }
        return out.slice(-lines);
    }

    get logPath(): string {
        return getAuditPath(auditDayStamp());
    }

    get retentionDays(): number {
        return RETENTION_DAYS;
    }

    clear(): void {
        for (const f of this.logFiles()) {
            try {
                fs.unlinkSync(f);
            } catch {
            }
        }
    }

    private logFiles(): string[] {
        const dir = getStateDir();
        let names: string[];
        try {
            names = fs.readdirSync(dir);
        } catch {
            return [];
        }
        const dated = names
            .filter(n => DATED_LOG.test(n))
            .sort()
            .reverse();
        const legacy = names.includes('audit.log') ? [getLegacyAuditPath()] : [];
        return [...dated.map(n => path.join(dir, n)), ...legacy];
    }

    private maybePrune(day: string): void {
        if (this.cleanedOn === day) {
            return;
        }
        this.cleanedOn = day;

        const cutoff = auditDayStamp(Date.now() - RETENTION_DAYS * 86400_000);
        try {
            for (const name of fs.readdirSync(getStateDir())) {
                const m = DATED_LOG.exec(name);
                if (m && m[1] < cutoff) {
                    fs.unlinkSync(path.join(getStateDir(), name));
                }
            }
        } catch {
        }
    }
}
