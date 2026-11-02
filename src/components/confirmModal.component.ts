import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { MCP_MODAL_STYLES } from './modal-style';
import { MCP_UI_STYLES } from './shared-ui-styles';
import { t } from '../i18n/t';

@Component({
    encapsulation: ViewEncapsulation.None,
    styles: [
        MCP_MODAL_STYLES,
        MCP_UI_STYLES,
        `

            .mcp-countdown-bar {
                height: 3px;
                margin: 0 18px 10px;
                border-radius: 2px;
                background: rgba(127, 127, 127, 0.2);
                overflow: hidden;
            }
            .mcp-countdown-bar > div {
                height: 100%;
                background: var(--bs-warning);
                transition: width 0.25s linear;
            }
            .mcp-countdown-bar.urgent > div {
                background: var(--bs-danger);
            }
        `,
    ],
    template: `

        <div
            class="alert alert-warning rounded-0 border-0 mb-0 py-2 px-3 small d-flex align-items-center"
            *ngIf="reasonText"
        >
            <i class="fas fa-fw fa-exclamation-triangle me-2"></i>
            <span>{{ reasonText }}</span>
        </div>

        <div class="modal-header py-2">
            <h5 class="modal-title fs-6">
                <i class="fas fa-fw mcp-modal-title-icon fa-exclamation-triangle" aria-hidden="true"></i>
                {{ 'confirm.title' | mcpT }}
            </h5>
        </div>

        <div class="modal-body">

            <div class="small mb-2">
                {{ 'confirm.target' | mcpT }} <strong>{{ tabTitle }}</strong>
                <span class="badge bg-secondary ms-1">{{ tabType }}</span>
            </div>

            <div class="small mb-2" *ngIf="explanation">
                <div class="mb-1 mcp-dim">
                    {{ 'confirm.modelNote' | mcpT }}
                </div>
                <div class="d-flex align-items-start">
                    <i class="fas fa-fw fa-comment-dots me-2 mt-1"></i>
                    <span style="overflow-wrap: anywhere;">{{ explanation }}</span>
                </div>
            </div>

            <pre class="mcp-pre mb-0">{{ command }}</pre>

            <div class="alert alert-success d-flex align-items-center mt-3 mb-0 py-2 px-3 small">
                <i class="fas fa-fw fa-lock me-2"></i>
                <span [innerHTML]="'confirm.promise' | mcpT"></span>
            </div>

            <label class="small mt-3 mb-1 d-block">{{ 'confirm.reasonLabel' | mcpT }}</label>
            <textarea
                class="form-control form-control-sm"
                rows="2"
                maxlength="500"
                [(ngModel)]="feedback"
                [placeholder]="'confirm.reasonPlaceholder' | mcpT"
            ></textarea>
        </div>

        <div class="mcp-countdown-bar" [class.urgent]="urgent" *ngIf="totalMs">
            <div [style.width.%]="percentLeft"></div>
        </div>
        <div class="modal-footer">
            <span
                class="small me-auto"
                *ngIf="totalMs"
                [class.text-danger]="urgent"
                [class.mcp-dim]="!urgent"
            >
                <i
                    class="fas fa-fw me-1"
                    [class.fa-hourglass-half]="running"
                    [class.fa-pause]="!running"
                ></i>
                <ng-container *ngIf="running">{{
                    'confirm.countdown' | mcpT: { n: secondsLeft }
                }}</ng-container>
                <ng-container *ngIf="!running">{{
                    'confirm.paused' | mcpT: { n: secondsLeft }
                }}</ng-container>
            </span>

            <button class="btn btn-ghost" (click)="decline()" ngbAutofocus>
                {{ 'confirm.refuse' | mcpT }}
            </button>
            <button class="btn btn-primary" (click)="modal.close(true)">
                <i class="fas fa-fw fa-pen me-1"></i>{{ 'confirm.write' | mcpT }}
            </button>
        </div>
    `,
})
export class ConfirmModalComponent {
    @Input() command = '';
    @Input() explanation = '';
    @Input() tabTitle = '';
    @Input() tabType = '';
    @Input() reason?: string;
    @Input() detail?: string;
    @Input() totalMs = 0;
    @Input() remainingMs = 0;
    @Input() running = false;

    feedback = '';

    constructor(public modal: NgbActiveModal) {}

    get secondsLeft(): number {
        return Math.max(0, Math.ceil(this.remainingMs / 1000));
    }

    get percentLeft(): number {
        if (!this.totalMs) {
            return 0;
        }
        return Math.max(0, Math.min(100, (this.remainingMs / this.totalMs) * 100));
    }

    get urgent(): boolean {
        return this.secondsLeft <= 10;
    }

    get reasonText(): string {
        if (!this.reason) {
            return '';
        }
        if (this.reason === 'not_whitelisted') {
            return t('confirm.notWhitelisted');
        }
        if (this.reason === 'ambiguous_match') {
            return t('confirm.ambiguous', { detail: this.detail || '' });
        }
        return this.reason;
    }

    decline(): void {
        this.modal.close({ declined: true, feedback: this.feedback.trim() });
    }
}
