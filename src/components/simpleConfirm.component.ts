import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { MCP_MODAL_STYLES } from './modal-style';

@Component({
    encapsulation: ViewEncapsulation.None,
    styles: [MCP_MODAL_STYLES],
    template: `
        <div class="modal-header py-2">
            <h5 class="modal-title fs-6">
                <i
                    class="fas fa-fw mcp-modal-title-icon"
                    [ngClass]="danger ? 'fa-exclamation-triangle' : 'fa-question-circle'"
                    aria-hidden="true"
                ></i>
                {{ title | mcpT }}
            </h5>
        </div>
        <div class="modal-body">
            <div class="small" style="white-space: pre-wrap;">{{ message }}</div>
        </div>
        <div class="modal-footer">

            <button
                *ngIf="danger"
                class="btn btn-ghost"
                (click)="modal.dismiss()"
                ngbAutofocus
            >
                {{ 'common.cancel' | mcpT }}
            </button>
            <button *ngIf="!danger" class="btn btn-ghost" (click)="modal.dismiss()">
                {{ 'common.cancel' | mcpT }}
            </button>
            <button *ngIf="danger" class="btn btn-outline-danger" (click)="modal.close(true)">
                {{ confirmText | mcpT }}
            </button>

            <button
                *ngIf="!danger"
                class="btn btn-primary"
                (click)="modal.close(true)"
                ngbAutofocus
            >
                {{ confirmText | mcpT }}
            </button>
        </div>
    `,
})
export class SimpleConfirmComponent {
    @Input() title = 'common.confirm';
    @Input() message = '';
    @Input() confirmText = 'common.ok';
    @Input() danger = false;

    constructor(public modal: NgbActiveModal) {}
}
