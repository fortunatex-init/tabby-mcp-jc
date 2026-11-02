import { Injectable } from '@angular/core';

import { t } from '../i18n/t';

export type ToastKind = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface Toast {
    id: number;
    kind: ToastKind;
    icon: string;
    title?: string;
    message: string;
    delay: number;
}

const SHORT_MS = 3000;
const NORMAL_MS = 6000;
const LONG_MS = 12000;

const MAX_TOASTS = 4;

function defaultTitle(kind: ToastKind): string {
    if (kind === 'success') return 'toast.success';
    if (kind === 'warning') return 'toast.warning';
    if (kind === 'error' || kind === 'danger') return 'toast.danger';
    return 'toast.info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts: Toast[] = [];

    private seq = 0;

    notice(message: string): void {
        this.push('info', 'fa-info-circle', message, undefined, SHORT_MS);
    }

    success(message: string, title?: string): void {
        this.push('success', 'fa-check-circle', message, title, NORMAL_MS);
    }

    warning(message: string, title?: string): void {
        this.push('warning', 'fa-exclamation-triangle', message, title, NORMAL_MS);
    }

    error(message: string, title?: string): void {
        this.push('error', 'fa-times-circle', message, title, LONG_MS);
    }

    danger(message: string, title?: string): void {
        this.push('danger', 'fa-times-circle', message, title, LONG_MS);
    }

    remove(toast: Toast): void {
        const i = this.toasts.indexOf(toast);
        if (i >= 0) {
            this.toasts.splice(i, 1);
        }
    }

    clear(): void {
        this.toasts.length = 0;
    }

    private push(
        kind: ToastKind,
        icon: string,
        message: string,
        title: string | undefined,
        delay: number,
    ): void {
        this.toasts.push({
            id: ++this.seq,
            kind,
            icon,
            title: t(title || defaultTitle(kind)),
            message: t(message),
            delay,
        });
        while (this.toasts.length > MAX_TOASTS) {
            this.toasts.shift();
        }
    }
}
