import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NgZone } from '@angular/core';
import { firstValueFrom, merge, of, race, timer } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';
import { ConfigService } from 'tabby-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BaseTerminalTabComponent } from 'tabby-terminal';

import { McpToolDefinition, TOOL_DEFINITIONS } from '../core/tool-definitions';

import { AuditEntry, AuditService } from './audit.service';
import { ClaudeMcpConfig, isConfirmNonWhitelisted } from './config';
import { ConfirmModalComponent } from '../components/confirmModal.component';
import { mcpModalOptions } from '../components/modal-style';
import { TabRegistryService } from './tab-registry.service';
import { McpControlService } from './mcp-control.service';
import { assertNoSubmit, sanitizeCommandText } from '../core/sanitize';
import { describePending } from '../core/line-state';
import { encodeCursor, resolveReadWithCursor } from '../core/read-slice';
import { checkWhitelist } from '../core/whitelist';
import { FocusCountdown } from '../core/focus-countdown';

const IDLE_MS = 250;

const MAX_EXPLANATION_CHARS = 300;

const WAIT_DISABLED_REASON =
    '用户在 Tabby 的 MCP Server 设置里关闭了"允许等待响应",这次没有等待。' +
    '需要等回车的话,请用户打开该开关后再调用 await_enter;或请用户按回车后调用 read_terminal。';

const CONFIRM_TIMEOUT_SEC = 30;
const AWAIT_ENTER_TIMEOUT_SEC = 30;

type WaitOutcome = 'enter' | 'timeout' | 'destroyed' | 'cancelled';

interface ConfirmOutcome {
    confirmed: boolean;
    timedOut?: boolean;
    clientGone?: boolean;
    feedback?: string;
}

export class ToolError extends Error {
    constructor(
        public code: string,
        message: string,
    ) {
        super(message);
    }
}

const toolCallCtx = new AsyncLocalStorage<{ caller?: string; signal?: AbortSignal }>();

@Injectable({ providedIn: 'root' })
export class ToolsService {
    constructor(
        private registry: TabRegistryService,
        private config: ConfigService,
        private audit: AuditService,
        private zone: NgZone,
        private ngbModal: NgbModal,
        private control: McpControlService,
    ) {}

    private get settings(): ClaudeMcpConfig {
        return this.config.store.claudeMcp;
    }

    get definitions(): McpToolDefinition[] {
        return TOOL_DEFINITIONS;
    }

    get readTerminalEnabled(): boolean {
        return this.settings?.allowReadTerminal === true;
    }

    get waitForEnterEnabled(): boolean {
        return this.settings?.waitForEnter === true;
    }

    async call(
        name: string,
        args: any,
        opts?: { caller?: string; signal?: AbortSignal },
    ): Promise<any> {
        return toolCallCtx.run({ caller: opts?.caller, signal: opts?.signal }, () =>
            this.dispatch(name, args),
        );
    }

    private async dispatch(name: string, args: any): Promise<any> {
        this.control.syncFromFlag();
        if (this.control.paused) {
            throw new ToolError(
                'paused',
                '用户已「全部断开并暂停」MCP 服务。这不是故障 —— 等用户在 Tabby 里点「恢复服务」后再重试。',
            );
        }
        const started = Date.now();
        try {
            const result = await this.dispatchInner(name, args);
            this.control.record(
                name === 'list_tabs' ||
                    name === 'read_terminal' ||
                    name === 'write_terminal' ||
                    name === 'await_enter'
                    ? name
                    : 'other',
                `${name}`,
                { tabId: args?.tab_id, result: 'ok' },
            );
            return result;
        } catch (e: any) {
            this.control.record(
                name === 'list_tabs' ||
                    name === 'read_terminal' ||
                    name === 'write_terminal' ||
                    name === 'await_enter'
                    ? name
                    : 'other',
                `${name} 失败`,
                { tabId: args?.tab_id, result: e?.code || 'error' },
            );
            throw e;
        } finally {
            void started;
        }
    }

    private async dispatchInner(name: string, args: any): Promise<any> {
        switch (name) {
            case 'list_tabs':
                return this.listTabs();
            case 'read_terminal':
                if (!this.readTerminalEnabled) {
                    throw new ToolError(
                        'read_disabled',
                        '用户在 Tabby 的 MCP Server 设置里关闭了"允许读取终端内容",' +
                            '这个工具当前不可用。需要看输出的话,请用户把内容贴给你。',
                    );
                }
                return this.readTerminal(args ?? {});
            case 'write_terminal':
                return this.writeTerminal(args ?? {});
            case 'await_enter':
                return this.awaitEnter(args ?? {});
            default:
                throw new ToolError('unknown_tool', `unknown tool: ${name}`);
        }
    }

    private listTabs(): any {
        const tabs = this.registry.list().map(({ id, tab, active }) => {
            const xterm = this.xtermOf(tab);
            return {
                id,
                title: tab.customTitle || tab.title || '(untitled)',
                type: tab.profile?.type ?? 'unknown',
                profile_name: tab.profile?.name,
                active,
                ready: !!xterm,
                cols: xterm?.cols,
                rows: xterm?.rows,
                alt_screen: xterm?.buffer?.active?.type === 'alternate',
            };
        });
        this.writeAudit({ tool: 'list_tabs', result: 'ok' });
        return { tabs };
    }

    private async readTerminal(args: any): Promise<any> {
        const tab = this.requireTab(args.tab_id);
        if (!this.xtermOf(tab)) {
            throw new ToolError('tab_not_ready', '该标签页的终端前端尚未就绪');
        }

        if (args.lines !== undefined && !Number.isFinite(args.lines)) {
            throw new ToolError('invalid_args', 'lines 必须是数字');
        }
        const want = this.readLimit(args.lines);
        const includeScrollback = args.include_scrollback !== false;

        const snap = this.snapshot(tab, want, includeScrollback, args.cursor);

        this.writeAudit({
            tool: 'read_terminal',
            tabId: args.tab_id,
            tabTitle: tab.customTitle || tab.title,
            result: 'ok',
        });

        return snap;
    }

    private readLimit(lines: unknown): number {
        const maxCfg = this.settings?.maxReadLines;
        const max = Number.isFinite(maxCfg) && maxCfg >= 1 ? maxCfg : 200;
        const asked = typeof lines === 'number' ? lines : 200;
        return Math.max(1, Math.min(Math.floor(asked), max));
    }

    private snapshot(
        tab: BaseTerminalTabComponent<any>,
        want: number,
        includeScrollback: boolean,
        cursorRaw?: unknown,
    ): any {
        const xterm = this.xtermOf(tab);
        if (!xterm) {
            throw new ToolError('tab_not_ready', '等待结束后终端前端已不可用');
        }

        const buf = xterm.buffer.active;
        const total: number = buf.length;
        const altScreen = buf.type === 'alternate';

        const lineAt = (i: number): string => {
            const line = buf.getLine(i);
            return line ? line.translateToString(true) : '';
        };

        let start: number;
        let end: number;
        let cursorInvalid: boolean | undefined;
        let cursorInvalidReason: string | undefined;
        let nextCursor: string;

        if (altScreen || !includeScrollback) {
            start = buf.viewportY;
            end = Math.min(total, start + xterm.rows);
            const lastLine = end > start ? lineAt(end - 1) : '';
            nextCursor = encodeCursor(end, lastLine);
            if (cursorRaw !== undefined && cursorRaw !== null && cursorRaw !== '') {
                cursorInvalid = true;
                cursorInvalidReason = 'cursor_not_applicable_viewport_or_alt';
            }
        } else {
            end = total;
            while (end > 0 && !lineAt(end - 1).trim()) {
                end--;
            }
            const resolved = resolveReadWithCursor(
                lineAt,
                end,
                want,
                this.registry.getReadAnchor(tab),
                cursorRaw,
            );
            start = resolved.range.start;
            end = resolved.range.end;
            nextCursor = resolved.nextCursor;
            cursorInvalid = resolved.cursor_invalid;
            cursorInvalidReason = resolved.cursor_invalid_reason;
        }

        const out: string[] = [];
        for (let i = start; i < end; i++) {
            out.push(lineAt(i));
        }
        if (!altScreen) {
            while (out.length && !out[out.length - 1].trim()) {
                out.pop();
            }
        }

        const result: any = {
            text: out.join('\n'),
            lines_returned: out.length,
            total_buffer_lines: total,
            alt_screen: buf.type === 'alternate',

            term_cursor: { x: buf.cursorX, y: buf.cursorY },

            cursor: nextCursor,
        };
        if (cursorInvalid) {
            result.cursor_invalid = true;
            result.cursor_invalid_reason = cursorInvalidReason;
        }
        return result;
    }

    private async waitForEnter(
        tab: BaseTerminalTabComponent<any>,
        tabId: string,
        deadline: number = Date.now() + AWAIT_ENTER_TIMEOUT_SEC * 1000,
    ): Promise<{ enterDetected: boolean; timedOut: boolean }> {
        let outcome: WaitOutcome;
        if (this.registry.takePendingEnter(tab)) {
            outcome = 'enter';
        } else {
            outcome = await firstValueFrom(
                race(
                    this.registry.enter$.pipe(
                        filter(t => t === tab),
                        map((): WaitOutcome => 'enter'),
                    ),
                    tab.destroyed$.pipe(map((): WaitOutcome => 'destroyed')),
                    this.control.cancelWaits$.pipe(map((): WaitOutcome => 'cancelled')),
                    timer(this.remaining(deadline)).pipe(map((): WaitOutcome => 'timeout')),
                ),
            );
        }

        if (outcome === 'destroyed') {
            throw new ToolError('tab_closed', `标签页 ${tabId} 在等待回车的过程中被关闭了`);
        }
        if (outcome === 'cancelled') {
            throw new ToolError('paused', '等待回车时服务被「全部断开并暂停」取消');
        }
        if (outcome === 'timeout') {
            return { enterDetected: false, timedOut: true };
        }

        await this.waitForIdle(tab, deadline);
        return { enterDetected: true, timedOut: Date.now() >= deadline };
    }

    private async waitForIdle(tab: BaseTerminalTabComponent<any>, deadline: number): Promise<void> {
        const frontend = tab.frontend;
        if (!frontend) {
            return;
        }
        await firstValueFrom(
            race(
                merge(of(null), frontend.contentUpdated$).pipe(
                    debounceTime(IDLE_MS),
                    map(() => undefined),
                ),
                timer(this.remaining(deadline)).pipe(map(() => undefined)),
            ),
        );
    }

    private remaining(deadline: number): number {
        return Math.max(0, deadline - Date.now());
    }

    private async writeTerminal(args: any): Promise<any> {
        const tab = this.requireTab(args.tab_id);
        const tabTitle = tab.customTitle || tab.title || '(untitled)';

        if (typeof args.text !== 'string') {
            throw new ToolError('invalid_args', 'text 必须是字符串');
        }

        if (typeof args.explanation !== 'string' || !args.explanation.trim()) {
            throw new ToolError(
                'invalid_args',
                '缺少 explanation:请用一句话说明为什么要输入这条命令,再重新调用',
            );
        }
        const explanation = args.explanation
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_EXPLANATION_CHARS);

        const clean = sanitizeCommandText(args.text);
        if (!clean.text.trim()) {
            throw new ToolError('empty_command', '清洗之后没有可写入的内容');
        }

        this.refusePendingLine(tab, args.tab_id, tabTitle, clean.text);

        const check = checkWhitelist(clean.text, this.settings?.whitelist);
        let neededConfirmation = false;
        let confirmed: boolean | undefined;

        if (!check.allowed && isConfirmNonWhitelisted(this.settings?.confirmNonWhitelisted)) {
            neededConfirmation = true;
            const outcome = await this.confirm(
                tabTitle,
                tab.profile?.type ?? '',
                clean.text,
                explanation,
                check,
                toolCallCtx.getStore()?.signal,
            );
            confirmed = outcome.confirmed;
            if (outcome.clientGone) {
                this.writeAudit({
                    tool: 'write_terminal',
                    tabId: args.tab_id,
                    tabTitle,
                    text: clean.text,
                    explanation,
                    whitelisted: false,
                    confirmed: false,
                    result: 'denied',
                    error: 'client_cancelled',
                });
                throw new ToolError(
                    'client_cancelled',
                    '调用方已经断开,确认框已关闭,命令没有写入。',
                );
            }
            if (!confirmed) {
                this.writeAudit({
                    tool: 'write_terminal',
                    tabId: args.tab_id,
                    tabTitle,
                    text: clean.text,
                    explanation,
                    whitelisted: false,
                    confirmed: false,
                    result: 'denied',
                    feedback: outcome.feedback,
                    error: outcome.timedOut ? 'confirm_timeout' : undefined,
                });
                throw new ToolError(
                    outcome.timedOut ? 'confirm_timeout' : 'user_declined',
                    this.describeDecline(outcome),
                );
            }
        }

        assertNoSubmit(clean.text);

        if (toolCallCtx.getStore()?.signal?.aborted) {
            throw new ToolError('client_cancelled', '调用方已经断开,命令没有写入。');
        }

        const gone = this.notWritable(args.tab_id, tab);
        if (gone) {
            this.writeAudit({
                tool: 'write_terminal',
                tabId: args.tab_id,
                tabTitle,
                text: clean.text,
                explanation,
                whitelisted: check.allowed,
                matchedRule: check.matchedRule,
                confirmed,
                result: 'error',
                error: gone.message,
            });
            throw gone;
        }

        this.refusePendingLine(tab, args.tab_id, tabTitle, clean.text, confirmed);

        let payload = clean.text;
        const frontend: any = tab.frontend;
        if (frontend?.supportsBracketedPaste?.()) {
            payload = `\x1b[200~${clean.text}\x1b[201~`;
        }

        this.registry.recordInput(tab, Buffer.from(payload, 'utf-8'), 'ai');

        const xtermForAnchor = this.xtermOf(tab);
        const bufForAnchor = xtermForAnchor?.buffer?.active;
        if (
            bufForAnchor &&
            Number.isFinite(bufForAnchor.baseY) &&
            Number.isFinite(bufForAnchor.cursorY)
        ) {
            this.registry.markReadAnchor(tab, bufForAnchor.baseY + bufForAnchor.cursorY);
        }

        this.registry.runAiWrite(tab, () => this.zone.run(() => tab.sendInput(payload)));

        this.registry.markTyped(tab);

        this.writeAudit({
            tool: 'write_terminal',
            tabId: args.tab_id,
            tabTitle,
            text: clean.text,
            explanation,
            whitelisted: check.allowed,
            matchedRule: check.matchedRule,
            confirmed,
            result: 'ok',
        });

        return {
            ok: true,
            written: clean.text,
            sanitized: clean.modified,
            removed: clean.removed,
            whitelisted: check.allowed,
            matched_rule: check.matchedRule,
            needed_confirmation: neededConfirmation,
            submitted: false,
            hint: '命令已写入终端但未执行,请用户在 Tabby 里按回车。',
            next_step: this.waitForEnterEnabled
                ? '告诉用户去 Tabby 按回车之后,在同一轮里立刻调用 await_enter(tab_id)' +
                  '(需要屏幕内容就带 include_output: true)。不要结束回复等用户回消息。'
                : undefined,
        };
    }

    private async awaitEnter(args: any): Promise<any> {
        const tab = this.requireTab(args.tab_id);
        if (!this.xtermOf(tab)) {
            throw new ToolError('tab_not_ready', '该标签页的终端前端尚未就绪');
        }

        if (!this.waitForEnterEnabled) {
            this.writeAudit({
                tool: 'await_enter',
                tabId: args.tab_id,
                tabTitle: tab.customTitle || tab.title,
                result: 'ok',
            });
            return {
                submitted: false,
                timed_out: false,
                wait_disabled: true,
                wait_disabled_reason: WAIT_DISABLED_REASON,
            };
        }

        const wait = await this.waitForEnter(tab, args.tab_id);
        if (!wait.enterDetected) {
            this.writeAudit({
                tool: 'await_enter',
                tabId: args.tab_id,
                tabTitle: tab.customTitle || tab.title,
                result: 'ok',
            });
            return {
                submitted: false,
                timed_out: true,
                hint:
                    '用户还没按回车(或命令还没跑完)。告诉用户命令已经打好了,' +
                    '然后再调用 await_enter 接着等,不要重新 write_terminal。',
            };
        }

        const result: any = {
            submitted: true,
            timed_out: wait.timedOut,
            hint: wait.timedOut
                ? '已检测到回车,但到截止时间输出还没停,命令可能还在跑。'
                : '已检测到回车,输出已稳定。',
        };

        if (args.include_output === true) {
            if (!this.readTerminalEnabled) {
                result.read_disabled = true;
                result.hint +=
                    ' 用户关闭了"允许读取终端内容",看不到屏幕 —— 别猜输出,请用户把内容贴给你。';
            } else {
                result.output = this.snapshot(tab, this.readLimit(undefined), true);
                this.writeAudit({
                    tool: 'read_terminal',
                    tabId: args.tab_id,
                    tabTitle: tab.customTitle || tab.title,
                    result: 'ok',
                });
            }
        }

        this.writeAudit({
            tool: 'await_enter',
            tabId: args.tab_id,
            tabTitle: tab.customTitle || tab.title,
            result: 'ok',
        });
        return result;
    }

    private refusePendingLine(
        tab: BaseTerminalTabComponent<any>,
        tabId: string,
        tabTitle: string,
        text: string,
        confirmed?: boolean,
    ): void {
        const reason = this.registry.judgeLine(tab);
        if (!reason) {
            return;
        }
        this.writeAudit({
            tool: 'write_terminal',
            tabId,
            tabTitle,
            text,
            confirmed,
            result: 'denied',
            error: `pending_input:${reason}`,
        });
        throw new ToolError('pending_input', describePending(tabId, reason, confirmed === true));
    }

    private writeAudit(entry: AuditEntry): void {
        const caller = toolCallCtx.getStore()?.caller;
        this.audit.write(caller ? { ...entry, caller } : entry);
    }

    private requireTab(id: string): BaseTerminalTabComponent<any> {
        if (!id) {
            throw new ToolError('invalid_args', '缺少 tab_id');
        }
        const tab = this.registry.get(id);
        if (!tab) {
            throw new ToolError('unknown_tab', `找不到标签页 ${id},请重新调用 list_tabs`);
        }
        return tab;
    }

    private notWritable(tabId: string, tab: BaseTerminalTabComponent<any>): ToolError | null {
        if (this.registry.get(tabId) !== tab) {
            return new ToolError(
                'tab_closed',
                `标签页 ${tabId} 已经关闭,命令没有写入。请重新调用 list_tabs`,
            );
        }
        if (!tab.session || tab.session.open === false) {
            return new ToolError(
                'session_closed',
                `标签页 ${tabId} 的会话已经结束(进程退出或连接断开),命令没有写入`,
            );
        }
        return null;
    }

    private xtermOf(tab: BaseTerminalTabComponent<any>): any | null {
        if (!tab.frontendIsReady) {
            return null;
        }
        return (tab.frontend as any)?.xterm ?? null;
    }

    private describeDecline(outcome: ConfirmOutcome): string {
        if (outcome.timedOut) {
            return (
                `确认框在这个 Tabby 窗口处于前台时累计 ${CONFIRM_TIMEOUT_SEC} 秒没人点,` +
                '已自动拒绝(不是批准),命令没有写入。窗口在后台的时间没有计入。' +
                '请告诉用户确认框超时自动拒绝了,问要不要重新发起;得到同意后再调用,别自己马上重试。'
            );
        }
        if (outcome.feedback) {
            return (
                `用户拒绝了这条命令,并给出理由:"${outcome.feedback}"。` +
                '请按这个理由调整后再提出,不要原样重试。'
            );
        }
        return '用户拒绝了这条命令,没有说明理由。不要原样重试,先问问用户想怎么做。';
    }

    private confirm(
        tabTitle: string,
        tabType: string,
        command: string,
        explanation: string,
        check: { reason?: string; detail?: string },

        signal?: AbortSignal,
    ): Promise<ConfirmOutcome> {
        return this.zone.run(() =>
            this.openConfirm(tabTitle, tabType, command, explanation, check, signal),
        );
    }

    private openConfirm(
        tabTitle: string,
        tabType: string,
        command: string,
        explanation: string,
        check: { reason?: string; detail?: string },
        signal?: AbortSignal,
    ): Promise<ConfirmOutcome> {
        const previousFocus = document.activeElement as HTMLElement | null;
        const modal = this.ngbModal.open(ConfirmModalComponent, mcpModalOptions('warning'));
        const inst = modal.componentInstance as ConfirmModalComponent;
        const clock = new FocusCountdown(CONFIRM_TIMEOUT_SEC * 1000);
        inst.command = command;
        inst.explanation = explanation;
        inst.tabTitle = tabTitle;
        inst.tabType = tabType;
        inst.reason = check.reason;
        inst.detail = check.detail;
        inst.totalMs = clock.totalMs;

        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let paintTimer: ReturnType<typeof setInterval> | undefined;
        let cancelSub: { unsubscribe: () => void } | undefined;
        let onAbort: (() => void) | undefined;
        let onFocus: () => void = () => undefined;
        let onBlur: () => void = () => undefined;

        const dismiss = () => {
            try {
                modal.dismiss();
            } catch {

            }
        };
        const stop = () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            if (paintTimer) {
                clearInterval(paintTimer);
                paintTimer = undefined;
            }
            try {
                cancelSub?.unsubscribe();
            } catch {

            }
            cancelSub = undefined;
            if (onAbort) {
                signal?.removeEventListener('abort', onAbort);
            }
        };

        const outcome = new Promise<ConfirmOutcome>(resolve => {
            const settle = (result: ConfirmOutcome) => {
                if (settled) {
                    return;
                }
                settled = true;
                stop();
                resolve(result);
            };
            const paint = () => {
                inst.remainingMs = clock.remainingAt(Date.now());
                inst.running = clock.running;
            };
            const arm = () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                if (!clock.running || settled) {
                    return;
                }
                const ms = clock.remainingAt(Date.now());
                if (ms <= 0) {
                    clock.blur(Date.now());
                    paint();
                    dismiss();
                    settle({ confirmed: false, timedOut: true });
                    return;
                }
                timer = setTimeout(() => {
                    this.zone.run(() => arm());
                }, ms);
            };
            onFocus = () => {
                this.zone.run(() => {
                    clock.focus(Date.now());
                    paint();
                    arm();
                });
            };
            onBlur = () => {
                this.zone.run(() => {
                    clock.blur(Date.now());
                    paint();
                    arm();
                });
            };
            window.addEventListener('focus', onFocus);
            window.addEventListener('blur', onBlur);
            paintTimer = setInterval(() => this.zone.run(paint), 250);

            modal.result.then(
                r => {
                    settle(
                        r === true
                            ? { confirmed: true }
                            : { confirmed: false, feedback: r?.feedback || undefined },
                    );
                },
                () => {
                    settle({ confirmed: false });
                },
            );

            cancelSub = this.control.cancelWaits$.subscribe(() => {
                dismiss();
                settle({ confirmed: false, feedback: '服务已暂停' });
            });

            onAbort = () => {
                dismiss();
                settle({ confirmed: false, clientGone: true });
            };
            if (signal?.aborted) {
                onAbort();
            } else {
                signal?.addEventListener('abort', onAbort, { once: true });
            }

            if (document.hasFocus()) {
                onFocus();
            } else {
                paint();
            }
        });

        return outcome.finally(() => {
            stop();
            this.restoreFocus(previousFocus);
        });
    }

    private restoreFocus(el: HTMLElement | null): void {
        if (!el || el === document.body) {
            return;
        }
        setTimeout(() => {
            if (el.isConnected) {
                el.focus();
            }
        }, 200);
    }
}
